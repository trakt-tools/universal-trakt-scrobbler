import { BrowserStorage } from './BrowserStorage';

export interface TabProperties {
	active?: boolean;
	cookieStoreId?: string;
	index?: number;
	openerTabId?: number;
	pinned?: boolean;
	url?: string;
	windowId?: number;
}

class _Tabs {
	/**
	 * @param url The URL to open.
	 */
	open = async (url: string): Promise<browser.tabs.Tab | undefined> => {
		const tabs = await browser.tabs.query({ active: true, currentWindow: true });
		if (tabs.length === 0) {
			return;
		}
		const tabProperties: TabProperties = {
			index: tabs[0].index + 1,
			url,
		};
		const storage = await BrowserStorage.get('options');
		if (storage.options?.grantCookies && browser.cookies) {
			tabProperties.cookieStoreId = tabs[0].cookieStoreId;
		}
		return browser.tabs.create(tabProperties);
	};
}

export const Tabs = new _Tabs();
