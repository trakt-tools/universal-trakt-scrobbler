import { BrowserStorage, OptionDetails, StorageValuesOptions } from '@common/BrowserStorage';
import { EventDispatcher, StorageOptionsChangeData } from '@common/Events';
import { I18N } from '@common/I18N';
import { OptionsListItemRoot } from '@components/OptionsListItemRoot';
import { SelectOption } from '@components/SelectOption';
import { SwitchOption } from '@components/SwitchOption';
import { ListItemSecondaryAction, ListItemText } from '@mui/material';
import { useEffect, useState } from 'react';

interface OptionsListItemProps {
	option: OptionDetails<StorageValuesOptions>;
}

export const OptionsListItem = ({ option }: OptionsListItemProps): JSX.Element => {
	const [isDisabled, setDisabled] = useState(BrowserStorage.checkDisabledOption(option));
	const [value, setValue] = useState(option.value);

	const handleChange = (optionId: string, newValue: unknown) => {
		void EventDispatcher.dispatch('OPTIONS_CHANGE', null, {
			[optionId]: newValue,
		});
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const onStorageOptionsChange = (data: StorageOptionsChangeData) => {
			if (!data.options) {
				return;
			}

			const newValue = data.options[option.id];
			if (typeof newValue !== 'undefined') {
				setValue(newValue as StorageValuesOptions[keyof StorageValuesOptions]);
			} else if (option.dependencies) {
				const hasDependenciesChanged = option.dependencies.some(
					(dependency) => data.options && dependency in data.options
				);
				if (hasDependenciesChanged) {
					setDisabled(BrowserStorage.checkDisabledOption(option));
				}
			}
		};

		startListeners();
		return stopListeners;
	}, []);

	let secondaryAction;
	switch (option.type) {
		case 'switch':
			secondaryAction = (
				<SwitchOption
					id={option.id}
					value={value as boolean}
					isDisabled={isDisabled}
					handleChange={handleChange}
				/>
			);
			break;
		case 'select':
			secondaryAction = (
				<SelectOption
					id={option.id}
					value={value as string}
					isDisabled={isDisabled}
					choices={option.choices}
					handleChange={handleChange}
				/>
			);
			break;
		default:
			secondaryAction = null;
			break;
	}

	return (
		<OptionsListItemRoot>
			<ListItemText
				primary={I18N.translate(option.id)}
				secondary={I18N.translate(`${option.id}Description`)}
			/>
			<ListItemSecondaryAction>{secondaryAction}</ListItemSecondaryAction>
		</OptionsListItemRoot>
	);
};
