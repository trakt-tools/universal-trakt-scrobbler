import { StreamingService } from '@streaming-services';

export const NetflixService: StreamingService = {
	id: 'netflix',
	name: 'Netflix',
	homePage: 'https://www.netflix.com/',
	hostPatterns: ['*://*.netflix.com/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
};
