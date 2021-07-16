import { Service } from '@models/Service';

export const VtmgoBeService = new Service({
	id: 'vtmgo-be',
	name: 'VTMGo BE',
	homePage: 'https://www.vtm.be/vtmgo',
	hostPatterns: ['*://*.vtmgo.be/*', '*://*.vtm.be/vtmgo/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
