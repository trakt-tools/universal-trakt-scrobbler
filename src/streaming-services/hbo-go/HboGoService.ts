import { StreamingService } from '../streaming-services';

export const HboGoService: StreamingService = {
	id: 'hbo-go',
	name: 'HBO Go',
	homePage: 'https://www.hbogola.com/',
	hostPatterns: ['*://*.hbogola.com/*', '*://*.hbogo.com.br/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
};
