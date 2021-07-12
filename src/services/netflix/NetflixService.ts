import { Service } from '@services';

export const NetflixService: Service = {
	id: 'netflix',
	name: 'Netflix',
	homePage: 'https://www.netflix.com/',
	hostPatterns: ['*://*.netflix.com/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
};
