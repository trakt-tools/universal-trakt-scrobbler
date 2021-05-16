import { StreamingServiceId } from '../streaming-services';
import { Api } from './Api';
import { ScrobbleController, ScrobbleParser } from './ScrobbleController';
import { ScrobbleEvents } from './ScrobbleEvents';
import { SyncPage } from './SyncPage';
import { SyncStore, SyncStoreId } from './SyncStore';

const apis = {} as Record<StreamingServiceId, Api>;

export const registerApi = (serviceId: StreamingServiceId, serviceApi: Api) => {
	apis[serviceId] = serviceApi;
};

export const getApi = (serviceId: StreamingServiceId) => {
	return apis[serviceId];
};

const scrobbleParsers = {} as Record<StreamingServiceId, ScrobbleParser>;

export const registerScrobbleParser = (serviceId: StreamingServiceId, parser: ScrobbleParser) => {
	scrobbleParsers[serviceId] = parser;
};

const scrobbleControllers = {} as Record<StreamingServiceId, ScrobbleController>;

export const getScrobbleController = (serviceId: StreamingServiceId) => {
	if (!scrobbleControllers[serviceId]) {
		scrobbleControllers[serviceId] = new ScrobbleController(scrobbleParsers[serviceId]);
	}
	return scrobbleControllers[serviceId];
};

const scrobbleEvents = {} as Record<StreamingServiceId, ScrobbleEvents>;

export const registerScrobbleEvents = (serviceId: StreamingServiceId, events: ScrobbleEvents) => {
	scrobbleEvents[serviceId] = events;
};

export const getScrobbleEvents = (serviceId: StreamingServiceId) => {
	return scrobbleEvents[serviceId];
};

const syncStores = {} as Record<SyncStoreId, SyncStore>;

export const getSyncStore = (serviceId: StreamingServiceId | null) => {
	const storeId: SyncStoreId = serviceId || 'multiple';
	if (!syncStores[storeId]) {
		syncStores[storeId] = new SyncStore(storeId);
	}
	return syncStores[storeId];
};

const syncPageBuilders = {} as Record<StreamingServiceId, () => React.ReactElement | null>;

export const getSyncPageBuilder = (
	serviceId: StreamingServiceId
): (() => React.ReactElement | null) => {
	if (!syncPageBuilders[serviceId]) {
		syncPageBuilders[serviceId] = () => SyncPage({ serviceId });
	}
	return syncPageBuilders[serviceId];
};
