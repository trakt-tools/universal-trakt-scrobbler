interface SharedValues {
	browser: BrowserName;
	isBackgroundPage: boolean;
}

type BrowserPrefix = 'moz' | 'chrome' | 'unknown';

type BrowserName = 'firefox' | 'chrome' | 'unknown';

const browsers: Record<BrowserPrefix, BrowserName> = {
	moz: 'firefox',
	chrome: 'chrome',
	unknown: 'unknown',
};
const browserPrefix = browser
	? (browser.runtime.getURL('/').split('-')[0] as BrowserPrefix)
	: 'unknown';

export const Shared: SharedValues = {
	browser: browsers[browserPrefix] || 'unknown',
	isBackgroundPage: false,
};
