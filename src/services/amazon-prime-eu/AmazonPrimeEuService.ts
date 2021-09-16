import { Service } from '@models/Service';

export const AmazonPrimeEuService = new Service({
	id: 'amazon-prime-eu',
	name: 'AmazonPrimeEu',
	homePage: 'https://www.primevideo.com/',
	hostPatterns: ['*://*.primevideo.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
