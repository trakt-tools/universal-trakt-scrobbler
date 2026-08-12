import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import browser, { Tabs as WebExtTabs } from 'webextension-polyfill';

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
			return Messaging.toExtension({
				action: 'open-tab',
				url,
				extraProperties,
			});
		}
		// There isn't always an active tab in a normal window (for example, when the background
		// service worker runs while no browser window is focused), so only use it to position
		// the new tab and to inherit the cookie store - never fail to open the tab because of it.
		const tabs = await browser.tabs.query({ active: true, currentWindow: true });
		const tabProperties: TabProperties = {
			url,
			...extraProperties,
		};
		if (tabs.length > 0) {
			tabProperties.index = tabs[0].index + 1;
			if (Shared.storage.options.grantCookies && browser.cookies) {
				tabProperties.cookieStoreId = tabs[0].cookieStoreId;
			}
		}
		return browser.tabs.create(tabProperties);
	}
}

export const Tabs = new _Tabs();
