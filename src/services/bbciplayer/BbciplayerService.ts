import { Service } from '@models/Service';

export const BbciplayerService = new Service({
	id: 'bbciplayer',
	name: 'BBC iPlayer',
	homePage: 'https://www.bbc.co.uk',
	hostPatterns: ['*://*.bbc.co.uk/*', '*://*.bbc.com/*'],
	hasScrobbler: false,
	hasSync: true,
	hasAutoSync: true,
	limitations: [
		'iPlayer homepage needs opening before use',
		'iPlayer history only retains the last 50 watched shows',
		'iPlayer uses Shadow DOM preventing scrobble',
	],
});
