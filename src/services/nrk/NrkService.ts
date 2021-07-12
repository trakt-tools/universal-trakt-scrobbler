import { Service } from '@services';

export const NrkService: Service = {
	id: 'nrk',
	name: 'NRK',
	homePage: 'https://tv.nrk.no/',
	hostPatterns: ['*://*.nrk.no/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
};
