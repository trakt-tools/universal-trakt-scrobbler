import { Service } from '@models/Service';

export const HotstarService = new Service({
	id: 'hotstar',
	name: 'Hotstar',
	homePage: 'https://www.hotstar.com',
	hostPatterns: ['*://*.www.hotstar.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
