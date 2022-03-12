import browser from 'webextension-polyfill';
import type { BrowserStorage } from '@common/BrowserStorage';
import type { Errors } from '@common/Errors';
import type { EventDispatcher } from '@common/Events';

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

	storage: typeof BrowserStorage;
	errors: typeof Errors;
	events: typeof EventDispatcher;
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
	dateFormat: 'EEE d MMM yyyy, H:mm:ss',

	storage: {} as typeof BrowserStorage,
	errors: {} as typeof Errors,
	events: {} as typeof EventDispatcher,
};
