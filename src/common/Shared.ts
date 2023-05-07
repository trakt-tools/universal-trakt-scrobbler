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

	manifestVersion: number;
	browser: BrowserName;
	pageType: PageType;
	tabId: number | null;
	redirectPath?: string;
	dateFormat: string;

	storage: typeof BrowserStorage;
	errors: typeof Errors;
	events: typeof EventDispatcher;

	functionsToInject: Record<string, () => unknown>;

	waitForInit: () => Promise<unknown>;
	finishInit: () => void;
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

let initPromiseResolve: (value: unknown) => void = () => {
	// Do nothing
};

const initPromise = new Promise((resolve) => (initPromiseResolve = resolve));

export const Shared: SharedValues = {
	DATABASE_URL: 'https://uts.rafaelgomes.xyz/api',

	environment: process.env.REACT_ENV || '',
	clientId: process.env.TRAKT_CLIENT_ID || '',
	clientSecret: process.env.TRAKT_CLIENT_SECRET || '',
	rollbarToken: process.env.ROLLBAR_TOKEN || '',
	tmdbApiKey: process.env.TMDB_API_KEY || '',

	manifestVersion: browser.runtime.getManifest().manifest_version,
	browser: browsers[browserPrefix] || 'unknown',
	pageType: 'content',
	tabId: null,
	dateFormat: 'EEE d MMM yyyy, H:mm:ss',

	storage: {} as typeof BrowserStorage,
	errors: {} as typeof Errors,
	events: {} as typeof EventDispatcher,

	functionsToInject: {},

	waitForInit: () => initPromise,
	finishInit: () => initPromiseResolve(null),
};
