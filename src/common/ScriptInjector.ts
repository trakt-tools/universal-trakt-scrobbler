import { BrowserStorage, StorageValues } from '@common/BrowserStorage';
import { Shared } from '@common/Shared';
import { Tabs } from '@common/Tabs';

export interface ScriptInjectorMessage {
	serviceId: string;
	key: string;
	url: string;
	fnStr: string;
}

class _ScriptInjector {
	injectedScriptIds = new Set<string>();

	startListeners() {
		browser.runtime.onConnect.addListener(this.onConnect);
	}

	stopListeners() {
		browser.runtime.onConnect.removeListener(this.onConnect);
	}

	private onConnect = (port: browser.runtime.Port) => {
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
			file: 'browser-polyfill.js',
			runAt: 'document_end',
		});
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
