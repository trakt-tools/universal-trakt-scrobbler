export type StreamingServiceId = 'amazon-prime' | 'hbo-go' | 'netflix' | 'nrk' | 'viaplay';

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
		hostPatterns: ['*://*.tv.nrk.no/*'],
		hasScrobbler: false,
		hasSync: true,
	},
	viaplay: {
		id: 'viaplay',
		name: 'Viaplay',
		homePage: 'https://viaplay.no/',
		hostPatterns: ['*://*.viaplay.no/*'],
		hasScrobbler: false,
		hasSync: true,
	},
};
