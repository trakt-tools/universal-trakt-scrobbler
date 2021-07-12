import { Service } from '@services';

export const DisneyplusService: Service = {
	id: 'disneyplus',
	name: 'DisneyPlus',
	homePage: 'https://www.disneyplus.com/',
	hostPatterns: ['*://*.disneyplus.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
