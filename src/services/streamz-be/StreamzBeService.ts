import { Service } from '@models/Service';

export const StreamzBeService = new Service({
	id: 'streamz-be',
	name: 'Streamz BE',
	homePage: 'https://www.streamz.be/',
	hostPatterns: ['*://*.streamz.be/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
