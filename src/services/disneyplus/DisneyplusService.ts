import { Service } from '@models/Service';

export const DisneyplusService = new Service({
	id: 'disneyplus',
	name: 'DisneyPlus',
	homePage: 'https://www.disneyplus.com/',
	hostPatterns: ['*://*.disneyplus.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
