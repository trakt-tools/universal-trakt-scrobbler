import { TraktScrobble } from '@apis/TraktScrobble';
import { ContentScriptConnectData, StorageOptionsChangeData } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { SessionStorage } from '@common/SessionStorage';
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
		const values = await SessionStorage.get('injectedContentScriptTabs');
		const injectedContentScriptTabs = new Set(values.injectedContentScriptTabs ?? []);
		if (injectedContentScriptTabs.has(data.tabId)) {
			injectedContentScriptTabs.delete(data.tabId);
			await SessionStorage.set({
				injectedContentScriptTabs: Array.from(injectedContentScriptTabs),
			});
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

	onTabUpdated = (
		_: unknown,
		changeInfo: WebExtTabs.OnUpdatedChangeInfoType,
		tab: WebExtTabs.Tab
	) => {
		void this.injectContentScript(changeInfo, tab);
	};

	async injectContentScript(
		changeInfo: WebExtTabs.OnUpdatedChangeInfoType,
		tab: Partial<WebExtTabs.Tab>
	) {
		const values = await SessionStorage.get('injectedContentScriptTabs');
		const injectedContentScriptTabs = new Set(values.injectedContentScriptTabs ?? []);
		if (
			tab.id &&
			injectedContentScriptTabs.has(tab.id) &&
			changeInfo.status === 'loading' &&
			typeof changeInfo.url === 'undefined'
		) {
			void Shared.events.dispatch('CONTENT_SCRIPT_DISCONNECT', null, { tabId: tab.id });
			return;
		}
		if (
			!this.contentScripts ||
			tab.status !== 'complete' ||
			!tab.id ||
			!tab.url ||
			!tab.url.startsWith('http') ||
			injectedContentScriptTabs.has(tab.id)
		) {
			return;
		}
		for (const { matches, js } of this.contentScripts) {
			if (!js) {
				continue;
			}
			const isMatch = matches.find((match) => tab.url?.match(match));
			if (isMatch) {
				injectedContentScriptTabs.add(tab.id);
				await SessionStorage.set({
					injectedContentScriptTabs: Array.from(injectedContentScriptTabs),
				});
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
	 * The function that will be injected must be added to the `{serviceId}-{key}` key in `Shared.functionsToInject` e.g. `netflix-session`. It should not contain any references to outside variables/functions, because they will not be available in the injected script.
	 *
	 * It should also not contain any syntax that gets transpiled by Babel, because Babel's helpers will not be available either. A good way to test it is to go to https://babeljs.io/repl#?browsers=&presets=typescript,env&externalPlugins=@babel/plugin-transform-runtime@7.15.0, paste the function and see if it adds Babel helpers at the top. If it does, try using older syntax that doesn't require polyfill.
	 *
	 * @param serviceId
	 * @param key This should be unique for `serviceId`.
	 * @param url If the content page isn't open, this URL will be used to open a tab in the background, so that the script can be injected. If an empty string is provided, `null` will be returned instead.	 *
	 * @param params If outside values are needed, they should be added to this object. It will be passed as the first argument to the function.
	 * @returns
	 */
	inject<T>(
		serviceId: string,
		key: string,
		url: string,
		params: Record<string, unknown> = {}
	): Promise<T | null> {
		if (Shared.pageType !== 'content') {
			return this.injectInTab(serviceId, key, url, params);
		}

		if (Shared.manifestVersion === 3) {
			return Messaging.toExtension({
				action: 'inject-function-from-background',
				serviceId,
				key,
				url,
				params,
				tabId: Shared.tabId,
			}) as Promise<T | null>;
		}

		return new Promise((resolve) => {
			try {
				const id = `${serviceId}-${key}`;

				if (!this.injectedScriptIds.has(id)) {
					const scriptFn = this.getScriptFn();
					const idStr = JSON.stringify(id);
					const fnStr = Shared.functionsToInject[id].toString();
					const fnParamsStr = JSON.stringify(params);
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
			} catch (_err) {
				resolve(null);
			}
		});
	}

	async injectInTab<T>(
		serviceId: string,
		key: string,
		url: string,
		params: Record<string, unknown> = {},
		tabId: number | null = null
	): Promise<T | null> {
		return new Promise((resolve) => {
			const id = `${serviceId}-${key}`;

			if (Shared.manifestVersion === 3 && tabId !== null) {
				void browser.scripting
					.executeScript({
						target: { tabId },
						func: Shared.functionsToInject[id],
						args: [params],
						// @ts-expect-error This is a newer value, so it's missing from the types.
						world: 'MAIN',
					})
					.then((results) => {
						const value = results[0].result as T | null;
						resolve(value);
					});
				return;
			}

			if (!url) {
				resolve(null);
				return;
			}

			const onScriptConnect = async (data: ContentScriptConnectData) => {
				if (typeof tabId === 'undefined' || tabId !== data.tabId) {
					return;
				}

				let value;
				if (Shared.manifestVersion === 3) {
					const results = await browser.scripting.executeScript({
						target: { tabId },
						func: Shared.functionsToInject[id],
						args: [params],
						// @ts-expect-error This is a newer value, so it's missing from the types.
						world: 'MAIN',
					});
					value = results[0].result as T | null;
				} else {
					value = (await Messaging.toContent(
						{ action: 'inject-function', serviceId, key, url, params },
						tabId
					)) as T | null;
				}
				void browser.tabs.remove(tabId);
				resolve(value);

				Shared.events.unsubscribe('CONTENT_SCRIPT_CONNECT', null, onScriptConnect);
			};

			Shared.events.subscribe('CONTENT_SCRIPT_CONNECT', null, onScriptConnect);

			Tabs.open(url, { active: false })
				.then((tab) => (tabId = tab?.id ?? null))
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
				} catch (_err) {
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
