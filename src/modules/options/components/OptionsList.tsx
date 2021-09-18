import { BrowserStorage, OptionsDetails, StorageValuesOptions } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { OptionsListItem } from '@components/OptionsListItem';
import { ServiceOptions } from '@components/ServiceOptions';
import { List } from '@mui/material';
import { useEffect } from 'react';
import { PartialDeep } from 'type-fest';

interface OptionsListProps {
	details: OptionsDetails;
}

export const OptionsList = ({ details }: OptionsListProps): JSX.Element => {
	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('OPTIONS_CHANGE', null, onOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('OPTIONS_CHANGE', null, onOptionsChange);
		};

		const onOptionsChange = (partialOptions: PartialDeep<StorageValuesOptions>) => {
			return BrowserStorage.saveOptions(partialOptions)
				.then(async () => {
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'saveOptionSuccess',
						severity: 'success',
					});
				})
				.catch(async (err) => {
					Errors.error('Failed to save option.', err);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'saveOptionFailed',
						severity: 'error',
					});
					throw err;
				});
		};

		startListeners();
		return stopListeners;
	}, []);

	return (
		<List>
			{Object.values(details)
				.filter((option) => option.doShow)
				.map((option) =>
					BrowserStorage.isOption(option, 'services', 'custom') ? (
						<ServiceOptions key={option.id} option={option} />
					) : (
						<OptionsListItem key={option.id} option={option} />
					)
				)}
		</List>
	);
};
