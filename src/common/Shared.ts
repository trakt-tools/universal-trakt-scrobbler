import { browser } from 'webextension-polyfill-ts';

export interface SharedValues {
	DATABASE_URL: string;

	environment: string;
	clientId: string;
	clientSecret: string;
	rollbarToken: string;
	tmdbApiKey: string;

	browser: BrowserName;
	pageType: PageType;
	tabId: number | null;
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

	environment: '@@environment',
	clientId: '@@clientId',
	clientSecret: '@@clientSecret',
	rollbarToken: '@@rollbarToken',
	tmdbApiKey: '@@tmdbApiKey',

	browser: browsers[browserPrefix] || 'unknown',
	pageType: 'content',
	tabId: null,
	dateFormat: 'ddd D MMM YYYY, H:mm:ss',
};
