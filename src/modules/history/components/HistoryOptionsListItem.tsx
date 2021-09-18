import { BrowserStorage, OptionDetails, StorageValuesSyncOptions } from '@common/BrowserStorage';
import { EventDispatcher, StorageOptionsChangeData } from '@common/Events';
import { I18N } from '@common/I18N';
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
		store.data.isLoading || BrowserStorage.checkSyncOptionDisabled(option)
	);
	const [value, setValue] = useState(option.value);

	const handleChange = (optionId: string, newValue: unknown) => {
		void EventDispatcher.dispatch('SYNC_OPTIONS_CHANGE', null, {
			[optionId]: newValue,
		});
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
			EventDispatcher.subscribe('SYNC_STORE_LOADING_START', null, checkDisabled);
			EventDispatcher.subscribe('SYNC_STORE_LOADING_STOP', null, checkDisabled);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
			EventDispatcher.unsubscribe('SYNC_STORE_LOADING_START', null, checkDisabled);
			EventDispatcher.unsubscribe('SYNC_STORE_LOADING_STOP', null, checkDisabled);
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
			setDisabled(store.data.isLoading || BrowserStorage.checkSyncOptionDisabled(option));
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
