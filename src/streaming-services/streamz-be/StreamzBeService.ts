import { StreamingService } from '../streaming-services';

export const StreamzBeService: StreamingService = {
	id: 'streamz-be',
	name: 'Streamz BE',
	homePage: 'https://www.streamz.be/',
	hostPatterns: ['*://*.streamz.be/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
