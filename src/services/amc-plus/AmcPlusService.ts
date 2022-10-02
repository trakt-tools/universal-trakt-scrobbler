import { Service } from '@models/Service';

export const AmcPlusService = new Service({
	id: 'amc-plus',
	name: 'AMC Plus',
	homePage: 'https://www.amcplus.com/',
	hostPatterns: ['*://*.amcplus.com/*', '*://*.amcn.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
