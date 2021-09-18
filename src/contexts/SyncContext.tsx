import { getServiceApi, ServiceApi } from '@apis/ServiceApi';
import { getService, Service } from '@models/Service';
import { getSyncStore, SyncStore } from '@stores/SyncStore';
import React, { useContext } from 'react';

export interface SyncContextValue {
	serviceId: string | null;
	service: Service | null;
	store: SyncStore;
	api: ServiceApi | null;
}

export const SyncContext = React.createContext<SyncContextValue>({} as SyncContextValue);

export const useSync = () => {
	const syncContext = useContext(SyncContext);
	if (typeof syncContext === 'undefined') {
		throw new Error('useSync() must be called from <SyncProvider/>');
	}
	return syncContext;
};

interface SyncProviderProps {
	serviceId: string | null;
	children: React.ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({
	serviceId,
	children,
}: SyncProviderProps) => {
	const service = serviceId ? getService(serviceId) : null;
	const store = getSyncStore(serviceId);
	const api = serviceId ? getServiceApi(serviceId) : null;

	const value = { serviceId, service, store, api };

	return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
