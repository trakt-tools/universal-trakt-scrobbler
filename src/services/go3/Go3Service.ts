import { Service } from '@models/Service';

export const Go3Service = new Service({
	id: 'go3',
	name: 'Go3',
	homePage: 'https://go3.lv/',
	hostPatterns: ['*://*.go3.lv/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
