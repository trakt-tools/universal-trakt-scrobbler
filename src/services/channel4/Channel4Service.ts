import { Service } from '@models/Service';

export const Channel4Service = new Service({
	id: 'channel4',
	name: 'Channel 4',
	homePage: 'https://www.channel4.com',
	hostPatterns: ['*://*.channel4.com/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
	limitations: ['Channel4 history only retains the last 50 watched shows'],
});
