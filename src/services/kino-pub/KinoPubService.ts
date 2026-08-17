import { Service } from '@models/Service';

export const KinoPubService = new Service({
	id: 'kino-pub',
	name: 'Kinopub',
	homePage: 'https://kino.watch/',
	hostPatterns: [
		'*://kino.watch/*',
		'*://*.kino.watch/*',
		'*://kino.pub/*',
		'*://*.kino.pub/*',
		'*://api.service-kp.com/*',
	],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
