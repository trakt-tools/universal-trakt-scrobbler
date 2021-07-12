import { Service } from '@models/Service';

export const HboGoService = new Service({
	id: 'hbo-go',
	name: 'HBO Go',
	homePage: 'https://www.hbogola.com/',
	hostPatterns: ['*://*.hbogola.com/*', '*://*.hbogo.com.br/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
