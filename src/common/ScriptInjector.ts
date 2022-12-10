import { TraktScrobble } from '@apis/TraktScrobble';
import { ContentScriptConnectData, StorageOptionsChangeData } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { Tabs } from '@common/Tabs';
import { getServices } from '@models/Service';
import browser, { Manifest as WebExtManifest, Tabs as WebExtTabs } from 'webextension-polyfill';

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
			Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
			Shared.events.subscribe('CONTENT_SCRIPT_DISCONNECT', null, this.onContentScriptDisconnect);
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

	private onContentScriptDisconnect = async (data: ContentScriptConnectData) => {
		if (this.injectedContentScriptTabs.has(data.tabId)) {
			this.injectedContentScriptTabs.delete(data.tabId);
		}
		const { scrobblingDetails } = await Shared.storage.get('scrobblingDetails');
		if (scrobblingDetails && data.tabId === scrobblingDetails.tabId) {
			await TraktScrobble.stop();
		}
	};

	updateContentScripts() {
		this.contentScripts = getServices()
			.filter(
				(service) =>
					(service.hasScrobbler && Shared.storage.options.services[service.id].scrobble) ||
					(service.hasSync && Shared.storage.options.services[service.id].sync)
			)
			.map((service) => ({
				matches: service.hostPatterns.map((hostPattern) =>
					hostPattern.replace(/^\*:\/\/\*\./, 'https?:\\/\\/([^/]*\\.)?').replace(/\/\*$/, '')
				),
				js: [`${service.id}.js`],
			}));
	}

	checkTabListener() {
		const shouldInject = getServices().some(
			(service) =>
				(service.hasScrobbler && Shared.storage.options.services[service.id].scrobble) ||
				(service.hasSync && Shared.storage.options.services[service.id].sync)
		);
		if (shouldInject && !browser.tabs.onUpdated.hasListener(this.onTabUpdated)) {
			browser.tabs.onUpdated.addListener(this.onTabUpdated);
		} else if (!shouldInject && browser.tabs.onUpdated.hasListener(this.onTabUpdated)) {
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
			this.injectedContentScriptTabs.has(tab.id)
		) {
			return;
		}
		for (const { matches, js } of this.contentScripts) {
			if (!js) {
				continue;
			}
			const isMatch = matches.find((match) => tab.url?.match(match));
			if (isMatch) {
				this.injectedContentScriptTabs.add(tab.id);
				for (const file of js) {
					if (Shared.manifestVersion === 3) {
						await browser.scripting.executeScript({ target: { tabId: tab.id }, files: [file] });
					} else {
						await browser.tabs.executeScript(tab.id, { file });
					}
				}
				break;
			}
		}
	}

	/**
	 * @param serviceId
	 * @param key This should be unique for `serviceId`.
	 * @param url If the content page isn't open, this URL will be used to open a tab in the background, so that the script can be injected. If an empty string is provided, `null` will be returned instead.
	 *
	 * @param fn The function that will be injected. It will be injected by converting it to a string (with `Function.prototype.toString`), so it should not contain any references to outside variables/functions, because they will not be available in the injected script.
	 *
	 * It should also not contain any syntax that gets transpiled by Babel, because Babel's helpers will not be available either. A good way to test it is to go to https://babeljs.io/repl#?browsers=&presets=typescript,env&externalPlugins=@babel/plugin-transform-runtime@7.15.0, paste the function and see if it adds Babel helpers at the top. If it does, try using older syntax that doesn't require polyfill.
	 *
	 * @param fnParams If outside values are needed, they should be passed here. The object will be converted to a string with `JSON.stringify`.
	 * @returns
	 */
	inject<T, U extends Record<string, unknown> = Record<string, unknown>>(
		serviceId: string,
		key: string,
		url: string,
		fn: ((params: U) => T | null) | string,
		fnParams: U | string = ''
	): Promise<T | null> {
		const fnStr = typeof fn === 'function' ? fn.toString() : fn;
		const fnParamsStr = typeof fnParams === 'object' ? JSON.stringify(fnParams) : fnParams;

		if (Shared.pageType !== 'content') {
			return this.injectInTab(serviceId, key, url, fnStr, fnParamsStr);
		}

		return new Promise((resolve) => {
			try {
				const id = `${serviceId}-${key}`;

				if (!this.injectedScriptIds.has(id)) {
					const idStr = JSON.stringify(id);
					const scriptFn = this.getScriptFn();
					const scriptFnStr = `(${scriptFn.toString()})(${idStr}, ${fnStr}, ${fnParamsStr});`;

					const script = document.createElement('script');
					script.textContent = scriptFnStr;
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
		fnStr: string,
		fnParamsStr: string
	): Promise<T | null> {
		if (!url) {
			return null;
		}

		return new Promise((resolve) => {
			let tabId: number | undefined;

			const onScriptConnect = async (data: ContentScriptConnectData) => {
				if (typeof tabId === 'undefined' || tabId !== data.tabId) {
					return;
				}

				const value = await Messaging.toContent(
					{ action: 'inject-function', serviceId, key, url, fnStr, fnParamsStr },
					tabId
				);
				void browser.tabs.remove(tabId);
				resolve(value as T | null);

				Shared.events.unsubscribe('CONTENT_SCRIPT_CONNECT', null, onScriptConnect);
			};

			Shared.events.subscribe('CONTENT_SCRIPT_CONNECT', null, onScriptConnect);

			Tabs.open(url, { active: false })
				.then((tab) => (tabId = tab?.id))
				.catch(() => {
					// Do nothing
				});
		});
	}

	private getScriptFn() {
		return <T, U extends Record<string, unknown>>(
			id: string,
			fn: (params: U) => T | null,
			fnParams: U
		) => {
			window.addEventListener(`uts-get-${id}`, () => {
				let value: T | null = null;
				try {
					value = fn(fnParams);
				} catch (err) {
					// Do nothing
				}

				const event = new CustomEvent(`uts-on-${id}-received`, {
					detail: value,
				});
				window.dispatchEvent(event);
			});
		};
	}
}

export const ScriptInjector = new _ScriptInjector();
