import { Service } from '@models/Service';

export const SkyshowtimeService = new Service({
	id: 'skyshowtime',
	name: 'SkyShowtime',
	homePage: 'https://www.skyshowtime.com/',
	hostPatterns: ['*://*.skyshowtime.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
