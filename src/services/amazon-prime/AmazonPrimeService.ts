import { Service } from '@models/Service';

export const AmazonPrimeService = new Service({
	id: 'amazon-prime',
	name: 'Amazon Prime',
	homePage: 'https://www.primevideo.com/',
	hostPatterns: ['*://*.primevideo.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
