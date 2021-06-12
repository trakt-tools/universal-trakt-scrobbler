import * as React from 'react';
import { LoginWrapper } from '../../components/LoginWrapper';
import { SyncPage } from '../../modules/history/pages/SyncPage';
import { StreamingService, streamingServices } from '../streaming-services';
import { Api } from './Api';
import { ScrobbleController } from './ScrobbleController';
import { ScrobbleEvents } from './ScrobbleEvents';
import { ScrobbleParser } from './ScrobbleParser';
import { SyncStore } from './SyncStore';

export interface StreamingServicePage extends StreamingService {
	path: string;
	pageBuilder: () => React.ReactNode | null;
}

const apis: Record<string, Api> = {};

export const registerApi = (id: string, api: Api) => {
	apis[id] = api;
};

export const getApi = (id: string) => {
	return apis[id];
};

const scrobbleParsers: Record<string, ScrobbleParser> = {};

export const registerScrobbleParser = (id: string, parser: ScrobbleParser) => {
	scrobbleParsers[id] = parser;
};

export const getScrobbleParser = (id: string) => {
	return scrobbleParsers[id];
};

const scrobbleEvents: Record<string, ScrobbleEvents> = {};

export const registerScrobbleEvents = (id: string, events: ScrobbleEvents) => {
	scrobbleEvents[id] = events;
};

export const getScrobbleEvents = (id: string) => {
	return scrobbleEvents[id];
};

const scrobbleControllers: Record<string, ScrobbleController> = {};

export const getScrobbleController = (id: string) => {
	if (!scrobbleControllers[id]) {
		scrobbleControllers[id] = new ScrobbleController(scrobbleParsers[id]);
	}
	return scrobbleControllers[id];
};

const syncStores: Record<string, SyncStore> = {};

export const getSyncStore = (serviceId: string | null) => {
	const storeId = serviceId || 'multiple';
	if (!syncStores[storeId]) {
		syncStores[storeId] = new SyncStore(storeId);
	}
	return syncStores[storeId];
};

const syncPageBuilders: Record<string, () => React.ReactNode | null> = {};

export const getSyncPageBuilder = (id: string): (() => React.ReactNode | null) => {
	if (!syncPageBuilders[id]) {
		syncPageBuilders[id] = LoginWrapper.wrap(() => <SyncPage serviceId={id} />);
	}
	return syncPageBuilders[id];
};

export const getServicePages = () => {
	return Object.values(streamingServices)
		.filter((service) => service.hasSync)
		.map((service) => ({
			...service,
			path: `/${service.id}`,
			pageBuilder: getSyncPageBuilder(service.id),
		}));
};
