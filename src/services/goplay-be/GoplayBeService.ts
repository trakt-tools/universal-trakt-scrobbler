import { Service } from '@services';

export const GoplayBeService: Service = {
	id: 'goplay-be',
	name: 'GoPlay BE',
	homePage: 'https://www.goplay.be/',
	hostPatterns: ['*://*.goplay.be/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
