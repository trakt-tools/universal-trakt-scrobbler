import { Service } from '@models/Service';

export const MubiService = new Service({
	id: 'mubi',
	name: 'MUBI',
	homePage: 'https://mubi.com',
	hostPatterns: ['*://*.mubi.com/*'],
	hasScrobbler: true,
	hasSync: true,
	hasAutoSync: true,
});
