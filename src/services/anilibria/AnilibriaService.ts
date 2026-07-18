import { Service } from '@models/Service';

export const AnilibriaService = new Service({
	id: 'anilibria',
	name: 'AniLibria',
	homePage: 'https://anilibria.top/',
	hostPatterns: ['*://anilibria.top/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
	limitations: [
		'Synced watched dates use the first import time when AniLibria does not provide a watched date',
	],
	loginPage: 'https://anilibria.top/app/auth/login',
});
