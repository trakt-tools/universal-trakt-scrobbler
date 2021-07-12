import { Service } from '@models/Service';

export const NrkService = new Service({
	id: 'nrk',
	name: 'NRK',
	homePage: 'https://tv.nrk.no/',
	hostPatterns: ['*://*.nrk.no/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
