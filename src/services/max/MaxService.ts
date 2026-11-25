import { Service } from '@models/Service';

export const MaxService = new Service({
	id: 'max',
	name: 'Max',
	homePage: 'https://www.max.com/',
	hostPatterns: '*://*.max.com/*',
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
