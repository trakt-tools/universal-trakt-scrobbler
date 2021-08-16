import { ServiceValue } from '@common/BrowserStorage';
import { EventDispatcher, StorageOptionsChangeData } from '@common/Events';
import { Utils } from '@common/Utils';
import { ServiceOptionRow } from '@components/ServiceOptionRow';
import { getService } from '@models/Service';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';

interface ServiceOptionProps {
	serviceId: string;
	initialValue: ServiceValue;
}

export const ServiceOption: React.FC<ServiceOptionProps> = ({ serviceId, initialValue }) => {
	const [value, setValue] = useState(initialValue);

	const service = getService(serviceId);

	const handleChange = useCallback((optionId: string, newValue: unknown) => {
		void EventDispatcher.dispatch('OPTIONS_CHANGE', null, {
			services: {
				[serviceId]: {
					[optionId]: newValue,
				},
			},
		});
	}, []);

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
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

ServiceOption.propTypes = {
	serviceId: PropTypes.string.isRequired,
	initialValue: PropTypes.any.isRequired,
};
