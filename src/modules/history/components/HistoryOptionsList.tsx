import { StorageValuesSyncOptions } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { HistoryOptionsListItem } from '@components/HistoryOptionsListItem';
import { useSync } from '@contexts/SyncContext';
import { Box, Button, ButtonGroup, Drawer, FormGroup, InputLabel, Toolbar } from '@mui/material';
import { useEffect } from 'react';
import { PartialDeep } from 'type-fest';

export const HistoryOptionsList = (): JSX.Element => {
	const { store } = useSync();

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('SYNC_OPTIONS_CHANGE', null, onOptionsChange);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('SYNC_OPTIONS_CHANGE', null, onOptionsChange);
		};

		const onOptionsChange = (partialOptions: PartialDeep<StorageValuesSyncOptions>) => {
			return Shared.storage
				.saveSyncOptions(partialOptions)
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
		<Drawer
			anchor="left"
			variant="permanent"
			sx={{
				'& .MuiDrawer-paper': {
					width: ({ sizes }) => sizes.sidebar,
					padding: 2,
				},
			}}
		>
			<Toolbar />
			<FormGroup
				sx={{
					position: 'sticky',
					top: 100,
					height: 'min-content',

					'& > *': {
						width: 1,
						marginY: 1,
						marginX: 0,
					},
				}}
			>
				{Object.values(Shared.storage.syncOptionsDetails).map((option) => (
					<HistoryOptionsListItem key={option.id} option={option} />
				))}
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<InputLabel shrink={true}>{I18N.translate('select')}</InputLabel>
					<ButtonGroup
						variant="contained"
						sx={{
							alignSelf: 'center',
						}}
					>
						<Button onClick={() => void store.selectAll()}>{I18N.translate('selectAll')}</Button>
						<Button onClick={() => void store.selectNone()}>{I18N.translate('selectNone')}</Button>
						<Button onClick={() => void store.toggleAll()}>{I18N.translate('toggleAll')}</Button>
					</ButtonGroup>
				</Box>
			</FormGroup>
		</Drawer>
	);
};
