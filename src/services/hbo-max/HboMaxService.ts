import { Service } from '@models/Service';

export const HboMaxService = new Service({
	id: 'hbo-max',
	name: 'HBO Max',
	homePage: 'https://www.hbomax.com/',
	hostPatterns: ['*://*.hbo.com/*', '*://*.hbomax.com/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
