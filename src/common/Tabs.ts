import { BrowserStorage } from '@common/BrowserStorage';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { browser, Tabs as WebExtTabs } from 'webextension-polyfill-ts';

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
	async open(url: string, extraProperties: TabProperties = {}): Promise<WebExtTabs.Tab | null> {
		if (Shared.pageType === 'content') {
			return Messaging.toBackground({
				action: 'open-tab',
				url,
				extraProperties,
			});
		}
		const tabs = await browser.tabs.query({ active: true, currentWindow: true });
		if (tabs.length === 0) {
			return null;
		}
		const tabProperties: TabProperties = {
			index: tabs[0].index + 1,
			url,
			...extraProperties,
		};
		if (BrowserStorage.options.grantCookies && browser.cookies) {
			tabProperties.cookieStoreId = tabs[0].cookieStoreId;
		}
		return browser.tabs.create(tabProperties);
	}
}

export const Tabs = new _Tabs();
