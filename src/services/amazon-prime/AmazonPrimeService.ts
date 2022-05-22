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
		'*://*.amazon.de/*',
	],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
