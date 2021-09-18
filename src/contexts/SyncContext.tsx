import { getServiceApi, ServiceApi } from '@apis/ServiceApi';
import { getService, Service } from '@models/Service';
import { getSyncStore, SyncStore } from '@stores/SyncStore';
import { createContext, useContext } from 'react';

export interface SyncContextValue {
	serviceId: string | null;
	service: Service | null;
	store: SyncStore;
	api: ServiceApi | null;
}

export const SyncContext = createContext<SyncContextValue>({} as SyncContextValue);

export const useSync = () => {
	const syncContext = useContext(SyncContext);
	if (typeof syncContext === 'undefined') {
		throw new Error('useSync() must be called from <SyncProvider/>');
	}
	return syncContext;
};

interface SyncProviderProps extends WithChildren {
	serviceId: string | null;
}

export const SyncProvider = ({ serviceId, children }: SyncProviderProps): JSX.Element => {
	const service = serviceId ? getService(serviceId) : null;
	const store = getSyncStore(serviceId);
	const api = serviceId ? getServiceApi(serviceId) : null;

	const value = { serviceId, service, store, api };

	return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
