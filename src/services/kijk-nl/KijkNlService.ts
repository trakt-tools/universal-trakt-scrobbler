import { Service } from '@models/Service';

export const KijkNlService = new Service({
	id: 'kijk-nl',
	name: 'Kijk.nl',
	homePage: 'https://www.kijk.nl',
	hostPatterns: ['*://*.kijk.nl/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
