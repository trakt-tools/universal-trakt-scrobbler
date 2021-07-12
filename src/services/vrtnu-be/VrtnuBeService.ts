import { Service } from '@services';

export const VrtnuBeService: Service = {
	id: 'vrtnu-be',
	name: 'VRTNu BE',
	homePage: 'https://www.vrt.be/vrtnu',
	hostPatterns: ['*://*.vrtnu.be/*', '*://*.vrt.be/vrtnu/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
