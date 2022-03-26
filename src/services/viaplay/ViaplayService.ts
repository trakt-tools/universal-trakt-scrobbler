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
		'*://*.viaplay.is/*',
		'*://*.viaplay.pl/*',
		'*://*.viaplay.ee/*',
		'*://*.viaplay.lv/*',
		'*://*.viaplay.lt/*',
	],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
