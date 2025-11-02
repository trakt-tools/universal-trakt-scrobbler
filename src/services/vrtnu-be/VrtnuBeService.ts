import { Service } from '@models/Service';

export const VrtnuBeService = new Service({
	id: 'vrtnu-be',
	name: 'VRT Max BE',
	homePage: 'https://www.vrt.be/vrtmax',
	hostPatterns: ['*://*.vrtnu.be/*', '*://*.vrtmax.be/*', '*://*.vrt.be/vrtmax/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
