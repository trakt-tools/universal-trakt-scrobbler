import { Service } from '@models/Service';

export const ViaplayService = new Service({
	id: 'viaplay',
	name: 'Viaplay',
	homePage: 'https://viaplay.com/',
	hostPatterns: [
		'*://*.viaplay.com/*',
		'*://*.viaplay.no/*',
		'*://*.viaplay.se/*',
		'*://*.viaplay.dk/*',
		'*://*.viaplay.fi/*',
	],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
