import { StreamingService } from '@streaming-services';

export const NrkService: StreamingService = {
	id: 'nrk',
	name: 'NRK',
	homePage: 'https://tv.nrk.no/',
	hostPatterns: ['*://*.nrk.no/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
};
