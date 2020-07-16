import { Page } from './Page';
import { Store } from './Store';
import { StreamingServiceId } from '../../../../streaming-services';
import { Api } from './Api';

const stores = {} as Record<StreamingServiceId, Store>;

export const getStore = (serviceId: StreamingServiceId) => {
	if (!stores[serviceId]) {
		stores[serviceId] = new Store();
	}
	return stores[serviceId];
};

const apis = {} as Record<StreamingServiceId, Api>;

export const registerApi = (serviceId: StreamingServiceId, serviceApi: Api) => {
	apis[serviceId] = serviceApi;
};

export const getApi = (serviceId: StreamingServiceId) => {
	return apis[serviceId];
};

const pageBuilders = {} as Record<StreamingServiceId, () => React.ReactElement | null>;

export const getPageBuilder = (
	serviceId: StreamingServiceId,
	serviceName: string
): (() => React.ReactElement | null) => {
	if (!pageBuilders[serviceId]) {
		pageBuilders[serviceId] = () =>
			Page({ serviceId, serviceName, store: getStore(serviceId), api: getApi(serviceId) });
	}
	return pageBuilders[serviceId];
};
