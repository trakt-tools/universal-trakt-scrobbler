import { Service } from '@models/Service';

export const CraveService = new Service({
	id: 'crave',
	name: 'Crave',
	homePage: 'https://www.crave.ca',
	hostPatterns: ['*://*.www.crave.ca/*', '*://*.bellmedia.ca/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
