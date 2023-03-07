import { Service } from '@models/Service';

export const CrunchyrollService = new Service({
	id: 'crunchyroll',
	name: 'Crunchyroll',
	homePage: 'https://www.crunchyroll.com/',
	hostPatterns: ['*://*.crunchyroll.com/*'],
	hasScrobbler: false,
	hasSync: true,
	hasAutoSync: true,
});
