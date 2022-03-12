import { OptionDetails, StorageValuesSyncOptions } from '@common/BrowserStorage';
import { StorageOptionsChangeData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { SwitchOption } from '@components/SwitchOption';
import { NumericTextFieldOption } from '@components/TextFieldOption';
import { useSync } from '@contexts/SyncContext';
import { useEffect, useState } from 'react';

interface HistoryOptionsListItemProps {
	option: OptionDetails<StorageValuesSyncOptions>;
}

export const HistoryOptionsListItem = ({ option }: HistoryOptionsListItemProps): JSX.Element => {
	const { store } = useSync();

	const [isDisabled, setDisabled] = useState(
		store.data.isLoading || Shared.storage.checkSyncOptionDisabled(option)
	);
	const [value, setValue] = useState(option.value);

	const handleChange = (optionId: string, newValue: unknown) => {
		void Shared.events.dispatch('SYNC_OPTIONS_CHANGE', null, {
			[optionId]: newValue,
		});
	};

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
			Shared.events.subscribe('SYNC_STORE_LOADING_START', null, checkDisabled);
			Shared.events.subscribe('SYNC_STORE_LOADING_STOP', null, checkDisabled);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
			Shared.events.unsubscribe('SYNC_STORE_LOADING_START', null, checkDisabled);
			Shared.events.unsubscribe('SYNC_STORE_LOADING_STOP', null, checkDisabled);
		};

		const onStorageOptionsChange = (data: StorageOptionsChangeData) => {
			if (!data.syncOptions) {
				return;
			}

			const newValue = data.syncOptions[option.id];
			if (typeof newValue !== 'undefined') {
				setValue(newValue);
			} else if (option.dependencies) {
				const hasDependenciesChanged = option.dependencies.some(
					(dependency) => data.syncOptions && dependency in data.syncOptions
				);
				if (hasDependenciesChanged) {
					checkDisabled();
				}
			}
		};

		const checkDisabled = () => {
			setDisabled(store.data.isLoading || Shared.storage.checkSyncOptionDisabled(option));
		};

		startListeners();
		return stopListeners;
	}, []);

	let component;
	switch (option.type) {
		case 'switch':
			component = (
				<SwitchOption
					id={option.id}
					label={I18N.translate(option.id)}
					value={value as boolean}
					isDisabled={isDisabled}
					handleChange={handleChange}
				/>
			);
			break;
		case 'number':
			component = (
				<NumericTextFieldOption
					id={option.id}
					label={I18N.translate(option.id)}
					value={value as number}
					isDisabled={isDisabled}
					minValue={option.minValue}
					maxValue={option.maxValue}
					handleChange={handleChange}
				/>
			);
			break;
		default:
			component = <></>;
			break;
	}
	return component;
};
