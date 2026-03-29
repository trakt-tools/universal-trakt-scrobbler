import { Service } from '@models/Service';

export const DiscoveryplusService = new Service({
	id: 'discoveryplus',
	name: 'discovery+',
	homePage: 'https://www.discoveryplus.com/',
	hostPatterns: ['*://*.discoveryplus.com/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
	limitations: [
		'Full history loads by show only, D+ removed ability to load several items at once.',
	],
});
