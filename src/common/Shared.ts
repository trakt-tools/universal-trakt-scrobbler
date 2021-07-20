import { History } from 'history';
import { browser } from 'webextension-polyfill-ts';

export interface SharedValues {
	DATABASE_URL: string;

	browser: BrowserName;
	pageType: PageType;
	tabId: number | null;
	history?: History;
	redirectPath?: string;
	dateFormat: string;
}

export type BrowserPrefix = 'moz' | 'chrome' | 'unknown';

export type BrowserName = 'firefox' | 'chrome' | 'unknown';

export type PageType = 'content' | 'popup' | 'background';

const browsers: Record<BrowserPrefix, BrowserName> = {
	moz: 'firefox',
	chrome: 'chrome',
	unknown: 'unknown',
};
const browserPrefix = browser
	? (browser.runtime.getURL('/').split('-')[0] as BrowserPrefix)
	: 'unknown';

export const Shared: SharedValues = {
	DATABASE_URL: 'https://uts.rafaelgomes.xyz/api',

	browser: browsers[browserPrefix] || 'unknown',
	pageType: 'content',
	tabId: null,
	dateFormat: 'ddd D MMM YYYY, H:mm:ss',
};
