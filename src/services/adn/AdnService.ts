import { Service } from '@models/Service';

export const AdnService = new Service({
	id: 'adn',
	name: 'ADN',
	homePage: 'https://animationdigitalnetwork.com',
	hostPatterns: ['*://*.animationdigitalnetwork.com/*'],
	hasScrobbler: false,
	hasSync: true,
	hasAutoSync: false,
});
