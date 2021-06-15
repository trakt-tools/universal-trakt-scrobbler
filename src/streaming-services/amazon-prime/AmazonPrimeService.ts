import { StreamingService } from '../streaming-services';

export const AmazonPrimeService: StreamingService = {
	id: 'amazon-prime',
	name: 'Amazon Prime',
	homePage: 'https://www.primevideo.com/',
	hostPatterns: ['*://*.primevideo.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
