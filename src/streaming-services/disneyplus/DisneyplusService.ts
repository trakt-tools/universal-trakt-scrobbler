import { StreamingService } from '@streaming-services';

export const DisneyplusService: StreamingService = {
	id: 'disneyplus',
	name: 'DisneyPlus',
	homePage: 'https://www.disneyplus.com/',
	hostPatterns: ['*://*.disneyplus.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
