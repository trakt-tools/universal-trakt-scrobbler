import { StreamingService } from '@streaming-services';

export const VtmgoBeService: StreamingService = {
	id: 'vtmgo-be',
	name: 'VTMGo BE',
	homePage: 'https://www.vtm.be/vtmgo',
	hostPatterns: ['*://*.vtmgo.be/*', '*://*.vtm.be/vtmgo/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
};
