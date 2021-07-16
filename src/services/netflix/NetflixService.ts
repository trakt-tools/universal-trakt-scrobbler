import { Service } from '@models/Service';

export const NetflixService = new Service({
	id: 'netflix',
	name: 'Netflix',
	homePage: 'https://www.netflix.com/',
	hostPatterns: ['*://*.netflix.com/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
