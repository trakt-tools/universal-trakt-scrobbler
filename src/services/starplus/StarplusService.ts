import { Service } from '@models/Service';

export const StarplusService = new Service({
	id: 'starplus',
	name: 'Star+',
	homePage: 'https://www.starplus.com/',
	hostPatterns: ['*://*.starplus.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
