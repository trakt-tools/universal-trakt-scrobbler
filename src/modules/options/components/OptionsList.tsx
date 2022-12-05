import { OptionsDetails, StorageValuesOptions } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { Shared } from '@common/Shared';
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
			Shared.events.subscribe('OPTIONS_CHANGE', null, onOptionsChange);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('OPTIONS_CHANGE', null, onOptionsChange);
		};

		const onOptionsChange = (partialOptions: PartialDeep<StorageValuesOptions>) => {
			return Shared.storage
				.saveOptions(partialOptions)
				.then(async () => {
					await Shared.events.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'saveOptionSuccess',
						severity: 'success',
					});
				})
				.catch(async (err) => {
					if (Errors.validate(err)) {
						Shared.errors.error('Failed to save option.', err);
					}
					await Shared.events.dispatch('SNACKBAR_SHOW', null, {
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
					Shared.storage.isOption(option, 'services', 'custom') ? (
						<ServiceOptions key={option.id} option={option} />
					) : (
						<OptionsListItem key={option.id} option={option} />
					)
				)}
		</List>
	);
};
