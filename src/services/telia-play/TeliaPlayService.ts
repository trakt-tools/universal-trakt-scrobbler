import { Service } from '@services';

export const TeliaPlayService: Service = {
	id: 'telia-play',
	name: 'Telia Play',
	homePage: 'https://teliaplay.se/',
	hostPatterns: ['*://*.teliaplay.se/*', '*://*.telia.net/*', '*://*.telia.se/*'],
	hasScrobbler: false,
	hasSync: true,
	hasAutoSync: false,
};
