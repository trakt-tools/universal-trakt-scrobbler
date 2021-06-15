import { StreamingService } from '../streaming-services';

export const TeliaPlayService: StreamingService = {
	id: 'telia-play',
	name: 'Telia Play',
	homePage: 'https://teliaplay.se/',
	hostPatterns: ['*://*.teliaplay.se/*', '*://*.telia.net/*', '*://*.telia.se/*'],
	hasScrobbler: false,
	hasSync: true,
	hasAutoSync: false,
};
