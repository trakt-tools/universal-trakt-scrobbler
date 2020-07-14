export type StreamingServiceId = 'netflix' | 'nrk' | 'viaplay';

export interface StreamingService {
	id: StreamingServiceId;
	name: string;
	homePage: string;
	hostPattern: string;
}

export const streamingServices: Record<StreamingServiceId, StreamingService> = {
	netflix: {
		id: 'netflix',
		name: 'Netflix',
		homePage: 'https://www.netflix.com/',
		hostPattern: '*://*.netflix.com/*',
	},
	nrk: {
		id: 'nrk',
		name: 'NRK',
		homePage: 'https://tv.nrk.no/',
		hostPattern: '*://*.tv.nrk.no/*',
	},
	viaplay: {
		id: 'viaplay',
		name: 'Viaplay',
		homePage: 'https://viaplay.no/',
		hostPattern: '*://*.viaplay.no/*',
	},
};
