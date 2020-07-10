import { NetflixPage } from './netflix/NetflixPage';
import { NrkPage } from './nrk/NrkPage';
import { ViaplayPage } from './viaplay/ViaplayPage';

interface StreamingService {
	id: string;
	name: string;
	path: string;
	page: () => React.ReactElement | null;
}

export const streamingServices: StreamingService[] = [
	{
		id: 'netflix',
		name: 'Netflix',
		path: '/netflix',
		page: NetflixPage,
	},
	{
		id: 'nrk',
		name: 'NRK',
		path: '/nrk',
		page: NrkPage,
	},
	{
		id: 'viaplay',
		name: 'Viaplay',
		path: '/viaplay',
		page: ViaplayPage,
	},
];
