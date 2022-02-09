import { Service } from '@models/Service';

export const WakanimTvService = new Service({
	id: 'wakanim-tv',
	name: 'Wakanim.tv',
	homePage: 'https://wakanim.tv',
	hostPatterns: ['*://*.wakanim.tv/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
