import { Service } from '@models/Service';

export const Tv2PlayService = new Service({
	id: 'tv2-play',
	name: 'TV 2 Play',
	homePage: 'https://play.tv2.no',
	hostPatterns: ['*://*.tv2.no/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
