export type StreamingServiceId = 'netflix' | 'nrk' | 'viaplay';

export interface StreamingService {
	id: StreamingServiceId;
	name: string;
	homePage: string;
	hostPatterns: string[];
}

export const streamingServices: Record<StreamingServiceId, StreamingService> = {
	netflix: {
		id: 'netflix',
		name: 'Netflix',
		homePage: 'https://www.netflix.com/',
		hostPatterns: ['*://*.netflix.com/*'],
	},
	nrk: {
		id: 'nrk',
		name: 'NRK',
		homePage: 'https://tv.nrk.no/',
		hostPatterns: ['*://*.tv.nrk.no/*'],
	},
	viaplay: {
		id: 'viaplay',
		name: 'Viaplay',
		homePage: 'https://viaplay.no/',
		hostPatterns: ['*://*.viaplay.no/*'],
	},
};
