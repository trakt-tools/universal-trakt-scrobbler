import { BrowserStorage, StorageValuesSyncOptions } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { HistoryOptionsListItem } from '@components/HistoryOptionsListItem';
import {
	Box,
	Button,
	ButtonGroup,
	Drawer,
	FormGroup,
	InputLabel,
	Toolbar,
} from '@material-ui/core';
import { SyncStore } from '@stores/SyncStore';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { PartialDeep } from 'type-fest';

interface HistoryOptionsListProps {
	store: SyncStore;
}

const _HistoryOptionsList: React.FC<HistoryOptionsListProps> = ({ store }) => {
	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('SYNC_OPTIONS_CHANGE', null, onOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('SYNC_OPTIONS_CHANGE', null, onOptionsChange);
		};

		const onOptionsChange = (partialOptions: PartialDeep<StorageValuesSyncOptions>) => {
			return BrowserStorage.saveSyncOptions(partialOptions)
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
		<Drawer classes={{ paper: 'history-options-sidebar' }} anchor="left" variant="permanent">
			<Toolbar />
			<FormGroup className="history-options-list-container">
				{Object.values(BrowserStorage.syncOptionsDetails).map((option) => (
					<HistoryOptionsListItem key={option.id} option={option} />
				))}
				<Box className="button-group-container">
					<InputLabel shrink={true}>{I18N.translate('select')}</InputLabel>
					<ButtonGroup className="button-group" variant="contained">
						<Button onClick={() => void store.selectAll().dispatchEvent(false)}>
							{I18N.translate('selectAll')}
						</Button>
						<Button onClick={() => void store.selectNone().dispatchEvent(false)}>
							{I18N.translate('selectNone')}
						</Button>
						<Button onClick={() => void store.toggleAll().dispatchEvent(false)}>
							{I18N.translate('toggleAll')}
						</Button>
					</ButtonGroup>
				</Box>
			</FormGroup>
		</Drawer>
	);
};

_HistoryOptionsList.propTypes = {
	store: PropTypes.instanceOf(SyncStore).isRequired,
};

export const HistoryOptionsList = React.memo(_HistoryOptionsList);
