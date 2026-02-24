import { Service } from '@models/Service';

export const KinoPubService = new Service({
	id: 'kino-pub',
	name: 'Kino.pub',
	homePage: 'https://kino.pub/',
	hostPatterns: ['*://*.kino.pub/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
