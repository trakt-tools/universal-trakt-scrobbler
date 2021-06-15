import { StreamingService } from '../streaming-services';

export const GoplayBeService: StreamingService = {
	id: 'goplay-be',
	name: 'GoPlay BE',
	homePage: 'https://www.goplay.be/',
	hostPatterns: ['*://*.goplay.be/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
