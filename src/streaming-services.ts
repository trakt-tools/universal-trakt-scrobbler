export type StreamingServiceId =
	| 'amazon-prime'
	| 'hbo-go'
	| 'netflix'
	| 'nrk'
	| 'viaplay'
	| 'telia-play'
	| 'streamz-be'
	| 'disneyplus';

export interface StreamingService {
	id: StreamingServiceId;
	name: string;
	homePage: string;
	hostPatterns: string[];
	hasScrobbler: boolean;
	hasSync: boolean;
}

export const streamingServices: Record<StreamingServiceId, StreamingService> = {
	'amazon-prime': {
		id: 'amazon-prime',
		name: 'Amazon Prime',
		homePage: 'https://www.primevideo.com/',
		hostPatterns: ['*://*.primevideo.com/*'],
		hasScrobbler: true,
		hasSync: false,
	},
	'hbo-go': {
		id: 'hbo-go',
		name: 'HBO Go',
		homePage: 'https://www.hbogola.com/',
		hostPatterns: ['*://*.hbogola.com/*', '*://*.hbogo.com.br/*'],
		hasScrobbler: true,
		hasSync: true,
	},
	netflix: {
		id: 'netflix',
		name: 'Netflix',
		homePage: 'https://www.netflix.com/',
		hostPatterns: ['*://*.netflix.com/*'],
		hasScrobbler: true,
		hasSync: true,
	},
	nrk: {
		id: 'nrk',
		name: 'NRK',
		homePage: 'https://tv.nrk.no/',
		hostPatterns: ['*://*.nrk.no/*'],
		hasScrobbler: true,
		hasSync: true,
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
	},
	'telia-play': {
		id: 'telia-play',
		name: 'Telia Play',
		homePage: 'https://teliaplay.se/',
		hostPatterns: ['*://*.teliaplay.se/*', '*://*.telia.net/*', '*://*.telia.se/*'],
		hasScrobbler: false,
		hasSync: true,
	},
	disneyplus: {
		id: 'disneyplus',
		name: 'DisneyPlus',
		homePage: 'https://www.disneyplus.com/',
		hostPatterns: ['*://*.disneyplus.com/*'],
		hasScrobbler: true,
		hasSync: false,
	},
};
