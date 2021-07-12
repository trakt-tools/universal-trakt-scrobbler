import { Service } from '@models/Service';

export const VrtnuBeService = new Service({
	id: 'vrtnu-be',
	name: 'VRTNu BE',
	homePage: 'https://www.vrt.be/vrtnu',
	hostPatterns: ['*://*.vrtnu.be/*', '*://*.vrt.be/vrtnu/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
