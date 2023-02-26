import { Service } from '@models/Service';

export const VidioService = new Service({
	id: 'vidio',
	name: 'Vidio',
	homePage: 'https://www.vidio.com',
	hostPatterns: ['*://*.www.vidio.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
