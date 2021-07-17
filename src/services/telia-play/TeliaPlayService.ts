import { Service } from '@models/Service';

export const TeliaPlayService = new Service({
	id: 'telia-play',
	name: 'Telia Play',
	homePage: 'https://teliaplay.se/',
	hostPatterns: ['*://*.teliaplay.se/*', '*://*.telia.net/*', '*://*.telia.se/*'],
	hasScrobbler: false,
	hasSync: true,
	hasAutoSync: false,
});