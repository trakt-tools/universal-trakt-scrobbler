export type StreamingServiceId =
	| 'amazon-prime'
	| 'hbo-go'
	| 'netflix'
	| 'nrk'
	| 'viaplay'
	| 'telia-play'
	| 'streamz-be'
	| 'vrtnu-be'
	| 'vtmgo-be'
	| 'goplay-be'
	| 'disneyplus';

export interface StreamingService {
	id: StreamingServiceId;
	name: string;
	homePage: string;
	hostPatterns: string[];
	hasScrobbler: boolean;
	hasSync: boolean;
	hasAutoSync: boolean;
}

export const streamingServices: Record<StreamingServiceId, StreamingService> = {
	'amazon-prime': {
		id: 'amazon-prime',
		name: 'Amazon Prime',
		homePage: 'https://www.primevideo.com/',
		hostPatterns: ['*://*.primevideo.com/*'],
		hasScrobbler: true,
		hasSync: false,
		hasAutoSync: false,
	},
	'hbo-go': {
		id: 'hbo-go',
		name: 'HBO Go',
		homePage: 'https://www.hbogola.com/',
		hostPatterns: ['*://*.hbogola.com/*', '*://*.hbogo.com.br/*'],
		hasScrobbler: true,
		hasSync: true,
		hasAutoSync: true,
	},
	netflix: {
		id: 'netflix',
		name: 'Netflix',
		homePage: 'https://www.netflix.com/',
		hostPatterns: ['*://*.netflix.com/*'],
		hasScrobbler: true,
		hasSync: true,
		hasAutoSync: true,
	},
	nrk: {
		id: 'nrk',
		name: 'NRK',
		homePage: 'https://tv.nrk.no/',
		hostPatterns: ['*://*.nrk.no/*'],
		hasScrobbler: true,
		hasSync: true,
		hasAutoSync: true,
	},
	viaplay: {
		id: 'viaplay',
		name: 'Viaplay',
		homePage: 'https://viaplay.com/',
		hostPatterns: [
			'*://*.viaplay.com/*',
			'*://*.viaplay.no/*',
			'*://*.viaplay.se/*',
			'*://*.viaplay.dk/*',
			'*://*.viaplay.fi/*',
		],
		hasScrobbler: false,
		hasSync: true,
		hasAutoSync: true,
	},
	'telia-play': {
		id: 'telia-play',
		name: 'Telia Play',
		homePage: 'https://teliaplay.se/',
		hostPatterns: ['*://*.teliaplay.se/*', '*://*.telia.net/*', '*://*.telia.se/*'],
		hasScrobbler: false,
		hasSync: true,
		hasAutoSync: false,
	},
	'streamz-be': {
		id: 'streamz-be',
		name: 'Streamz BE',
		homePage: 'https://www.streamz.be/',
		hostPatterns: ['*://*.streamz.be/*'],
		hasScrobbler: true,
		hasSync: false,
		hasAutoSync: false,
	},
	'vrtnu-be': {
		id: 'vrtnu-be',
		name: 'VRTNu BE',
		homePage: 'https://www.vrt.be/vrtnu',
		hostPatterns: ['*://*.vrtnu.be/*', '*://*.vrt.be/vrtnu/*'],
		hasScrobbler: true,
		hasSync: false,
		hasAutoSync: false,
	},
	'vtmgo-be': {
		id: 'vtmgo-be',
		name: 'VTMGo BE',
		homePage: 'https://www.vtm.be/vtmgo',
		hostPatterns: ['*://*.vtmgo.be/*', '*://*.vtm.be/vtmgo/*'],
		hasScrobbler: true,
		hasSync: false,
		hasAutoSync: false,
	},
	'goplay-be': {
		id: 'goplay-be',
		name: 'GoPlay BE',
		homePage: 'https://www.goplay.be/',
		hostPatterns: ['*://*.goplay.be/*'],
		hasScrobbler: true,
		hasSync: false,
		hasAutoSync: false,
	},
	disneyplus: {
		id: 'disneyplus',
		name: 'DisneyPlus',
		homePage: 'https://www.disneyplus.com/',
		hostPatterns: ['*://*.disneyplus.com/*'],
		hasScrobbler: true,
		hasSync: false,
		hasAutoSync: false,
	},
};
