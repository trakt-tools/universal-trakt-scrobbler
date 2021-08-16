import { TraktScrobble } from '@apis/TraktScrobble';
import { BrowserStorage, StorageValues } from '@common/BrowserStorage';
import {
	ContentScriptDisconnectData,
	EventDispatcher,
	StorageOptionsChangeData,
} from '@common/Events';
import { Shared } from '@common/Shared';
import { Tabs } from '@common/Tabs';
import { getServices } from '@models/Service';
import {
	browser,
	Manifest as WebExtManifest,
	Runtime as WebExtRuntime,
	Tabs as WebExtTabs,
} from 'webextension-polyfill-ts';

export interface ScriptInjectorMessage {
	serviceId: string;
	key: string;
	url: string;
	fnStr: string;
}

class _ScriptInjector {
	contentScripts: WebExtManifest.ContentScript[] | null = null;
	injectedContentScriptTabs = new Set();
	injectedScriptIds = new Set<string>();

	init() {
		if (Shared.pageType === 'background') {
			this.updateContentScripts();
			this.checkTabListener();
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
			EventDispatcher.subscribe('CONTENT_SCRIPT_DISCONNECT', null, this.onContentScriptDisconnect);
		} else if (Shared.pageType === 'content') {
			browser.runtime.onConnect.addListener(this.onConnect);
		}
	}

	private onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		if (data.options?.services) {
			const doCheck = Object.values(data.options.services).some(
				(serviceValue) => serviceValue && 'scrobble' in serviceValue
			);
			if (doCheck) {
				this.updateContentScripts();
				this.checkTabListener();
			}
		}
	};

	private onContentScriptDisconnect = async (data: ContentScriptDisconnectData) => {
		if (this.injectedContentScriptTabs.has(data.tabId)) {
			this.injectedContentScriptTabs.delete(data.tabId);
		}
		const { scrobblingDetails } = await BrowserStorage.get('scrobblingDetails');
		if (scrobblingDetails && data.tabId === scrobblingDetails.tabId) {
			await TraktScrobble.stop();
		}
	};

	updateContentScripts() {
		this.contentScripts = getServices()
			.filter(
				(service) => service.hasScrobbler && BrowserStorage.options.services[service.id].scrobble
			)
			.map((service) => ({
				matches: service.hostPatterns.map((hostPattern) =>
					hostPattern.replace(/^\*:\/\/\*\./, 'https?:\\/\\/([^/]*\\.)?').replace(/\/\*$/, '')
				),
				js: [`${service.id}.js`],
				run_at: 'document_idle',
			}));
	}

	checkTabListener() {
		const scrobblerEnabled = getServices().some(
			(service) => service.hasScrobbler && BrowserStorage.options.services[service.id].scrobble
		);
		if (scrobblerEnabled && !browser.tabs.onUpdated.hasListener(this.onTabUpdated)) {
			browser.tabs.onUpdated.addListener(this.onTabUpdated);
		} else if (!scrobblerEnabled && browser.tabs.onUpdated.hasListener(this.onTabUpdated)) {
			browser.tabs.onUpdated.removeListener(this.onTabUpdated);
		}
	}

	onTabUpdated = (_: unknown, __: unknown, tab: WebExtTabs.Tab) => {
		void this.injectContentScript(tab);
	};

	async injectContentScript(tab: Partial<WebExtTabs.Tab>) {
		if (
			!this.contentScripts ||
			tab.status !== 'complete' ||
			!tab.id ||
			!tab.url ||
			!tab.url.startsWith('http') ||
			tab.url.endsWith('#noinject') ||
			this.injectedContentScriptTabs.has(tab.id)
		) {
			return;
		}
		for (const { matches, js, run_at: runAt } of this.contentScripts) {
			if (!js || !runAt) {
				continue;
			}
			const isMatch = matches.find((match) => tab.url?.match(match));
			if (isMatch) {
				this.injectedContentScriptTabs.add(tab.id);
				for (const file of js) {
					await browser.tabs.executeScript(tab.id, { file, runAt });
				}
				break;
			}
		}
	}

	private onConnect = (port: WebExtRuntime.Port) => {
		port.onMessage.addListener((message: unknown) => {
			const { serviceId, key, url, fnStr } = message as ScriptInjectorMessage;
			this.inject(serviceId, key, url, fnStr)
				.then((value) => port.postMessage(value))
				.catch(() => port.postMessage(undefined));
		});
	};

	/**
	 * @param serviceId
	 * @param key This should be unique for `serviceId`.
	 * @param url If the content page isn't open, this URL will be used to open a tab in the background, so that the script can be injected. If an empty string is provided, `null` will be returned instead.
	 * @param fn The function that will be injected. It will be injected by converting it to a string (with `Function.prototype.toString`), so it should not contain any references to outside variables/functions, because they will not be available in the injected script.
	 * @returns
	 */
	inject<T>(
		serviceId: string,
		key: string,
		url: string,
		fn: (() => T | null) | string
	): Promise<T | null> {
		const fnStr = typeof fn === 'function' ? fn.toString() : fn;

		if (Shared.pageType !== 'content') {
			return this.injectInTab(serviceId, key, url, fnStr);
		}

		return new Promise((resolve) => {
			try {
				const id = `${serviceId}-${key}`;

				if (!this.injectedScriptIds.has(id)) {
					const script = document.createElement('script');
					script.textContent = `
						window.addEventListener('uts-get-${id}', () => {
							let value = null;
							try {
								value = (${fnStr})();
							} catch (err) {
								// Do nothing
							}

							const event = new CustomEvent('uts-on-${id}-received', {
								detail: value,
							});
							window.dispatchEvent(event);
						});
					`;
					document.body.appendChild(script);
					this.injectedScriptIds.add(id);
				}

				const listener = (listenerEvent: Event) => {
					window.removeEventListener(`uts-on-${id}-received`, listener);
					const value = (listenerEvent as CustomEvent<T | null>).detail;
					resolve(value);
				};
				window.addEventListener(`uts-on-${id}-received`, listener, false);

				const event = new CustomEvent(`uts-get-${id}`);
				window.dispatchEvent(event);
			} catch (err) {
				resolve(null);
			}
		});
	}

	private async injectInTab<T>(
		serviceId: string,
		key: string,
		url: string,
		fnStr: string
	): Promise<T | null> {
		const storageKey = `${serviceId}-${key}`
			.split('-')
			.map((word, index) => (index === 0 ? word : `${word[0].toUpperCase()}${word.slice(1)}`))
			.join('') as keyof StorageValues;
		const values = await BrowserStorage.get(storageKey);
		if (values[storageKey]) {
			return values[storageKey] as T;
		}

		if (!url) {
			return null;
		}

		const tab = await Tabs.open(`${url}#noinject`, { active: false });
		if (!tab?.id) {
			return null;
		}

		await browser.tabs.executeScript(tab.id, {
			file: `${serviceId}.js`,
			runAt: 'document_end',
		});

		const port = browser.tabs.connect(tab.id);
		return new Promise((resolve) => {
			port.onMessage.addListener((value) => {
				if (tab.id) {
					void browser.tabs.remove(tab.id);
				}
				void BrowserStorage.set({ [storageKey]: value as unknown }, false);
				resolve(value as unknown as T | null);
			});
			port.postMessage({ serviceId, key, url, fnStr });
		});
	}
}

export const ScriptInjector = new _ScriptInjector();
