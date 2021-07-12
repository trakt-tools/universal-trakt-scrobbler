import { Service } from '@services';

export const AmazonPrimeService: Service = {
	id: 'amazon-prime',
	name: 'Amazon Prime',
	homePage: 'https://www.primevideo.com/',
	hostPatterns: ['*://*.primevideo.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
