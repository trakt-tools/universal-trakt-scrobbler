import { ServiceValue } from '@common/BrowserStorage';
import { StorageOptionsChangeData } from '@common/Events';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { ServiceOptionRow } from '@components/ServiceOptionRow';
import { getService } from '@models/Service';
import { useCallback, useEffect, useState } from 'react';

interface ServiceOptionProps {
	serviceId: string;
	initialValue: ServiceValue;
}

export const ServiceOption = ({ serviceId, initialValue }: ServiceOptionProps): JSX.Element => {
	const [value, setValue] = useState(initialValue);

	const service = getService(serviceId);

	const handleChange = useCallback((optionId: string, newValue: unknown) => {
		void Shared.events.dispatch('OPTIONS_CHANGE', null, {
			services: {
				[serviceId]: {
					[optionId]: newValue,
				},
			},
		});
	}, []);

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const onStorageOptionsChange = (data: StorageOptionsChangeData) => {
			const newValue = data.options?.services?.[serviceId];
			if (typeof newValue !== 'undefined') {
				setValue((prevValue) => Utils.mergeObjs(prevValue, newValue));
			}
		};

		startListeners();
		return stopListeners;
	}, []);

	return (
		<ServiceOptionRow
			service={service}
			scrobble={value.scrobble}
			sync={value.sync}
			autoSync={value.autoSync}
			autoSyncDays={value.autoSyncDays}
			lastSync={value.lastSync}
			handleChange={handleChange}
		/>
	);
};
