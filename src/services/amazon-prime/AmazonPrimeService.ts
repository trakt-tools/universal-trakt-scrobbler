import { Service } from '@models/Service';

export const AmazonPrimeService = new Service({
	id: 'amazon-prime',
	name: 'Amazon Prime',
	homePage: 'https://www.primevideo.com/',
	hostPatterns: [
		'*://*.primevideo.com/*',
		'*://*.amazon.com/*',
		'*://*.amazon.co.jp/*',
		'*://*.amazon.co.uk/*',
		'*://*.amazon.com.au/*',
		'*://*.amazon.de/*',
	],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
	loginPage: 'https://www.primevideo.com/settings/watch-history/',
});
