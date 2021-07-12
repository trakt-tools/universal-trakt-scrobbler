import { Service } from '@services';

export const StreamzBeService: Service = {
	id: 'streamz-be',
	name: 'Streamz BE',
	homePage: 'https://www.streamz.be/',
	hostPatterns: ['*://*.streamz.be/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
