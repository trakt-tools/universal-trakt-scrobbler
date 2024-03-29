import { Service } from '@models/Service';

export const GoplayBeService = new Service({
	id: 'goplay-be',
	name: 'GoPlay BE',
	homePage: 'https://www.goplay.be/',
	hostPatterns: ['*://*.goplay.be/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
