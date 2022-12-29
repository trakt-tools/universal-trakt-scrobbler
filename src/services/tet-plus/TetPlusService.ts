import { Service } from '@models/Service';

export const TetPlusService = new Service({
	id: 'tet-plus',
	name: 'Tet TV+',
	homePage: 'https://tet.plus/',
	hostPatterns: ['*://*.tet.plus/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
