import { getSyncPageBuilder } from './common/common';
import { StreamingService, streamingServices } from './streaming-services';
import './hbo-go/HboGoApi';
import './netflix/NetflixApi';
import './nrk/NrkApi';
import './viaplay/ViaplayApi';
import './telia-play/TeliaPlayApi';

export interface StreamingServicePage extends StreamingService {
	path: string;
	pageBuilder: () => React.ReactElement | null;
}

export const streamingServicePages: StreamingServicePage[] = Object.values(streamingServices)
	.filter((service) => service.hasSync)
	.map((service) => ({
		...service,
		path: `/${service.id}`,
		pageBuilder: getSyncPageBuilder(service.id),
	}));
