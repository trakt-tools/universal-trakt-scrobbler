import { StreamingService, streamingServices } from './streaming-services';
import { getPageBuilder } from './common/common';
import './netflix/NetflixApi';
import './nrk/NrkApi';
import './viaplay/ViaplayApi';

export interface StreamingServicePage extends StreamingService {
	path: string;
	pageBuilder: () => React.ReactElement | null;
}

export const streamingServicePages: StreamingServicePage[] = Object.values(streamingServices).map(
	(service) => ({
		...service,
		path: `/${service.id}`,
		pageBuilder: getPageBuilder(service.id, service.name),
	})
);
