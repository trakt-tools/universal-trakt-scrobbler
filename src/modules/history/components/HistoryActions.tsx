import { BrowserStorage } from '@common/BrowserStorage';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { useSync } from '@contexts/SyncContext';
import { Box, Button, Divider } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import React, { useEffect, useState } from 'react';

export const HistoryActions: React.FC = () => {
	const { serviceId, store } = useSync();
	const theme = useTheme();

	const [areItemsMissingWatchedDate, setItemsMissingWatchedDate] = useState(
		store.areItemsMissingWatchedDate()
	);

	const onSyncClick = async () => {
		const selectedItems = store.data.items.filter((item) => item.isSelected);
		if (selectedItems.length === 0) {
			return EventDispatcher.dispatch('DIALOG_SHOW', null, {
				title: I18N.translate('cannotSync'),
				message: I18N.translate('noItemsSelected'),
			});
		}

		const missingWatchedDate = selectedItems.some((item) => item.isMissingWatchedDate());
		if (missingWatchedDate) {
			return EventDispatcher.dispatch('DIALOG_SHOW', null, {
				title: I18N.translate('cannotSync'),
				message: I18N.translate('itemsMissingWatchedDate'),
			});
		}

		await EventDispatcher.dispatch('SYNC_DIALOG_SHOW', null, {
			store,
			serviceId,
			items: selectedItems,
		});
	};

	const onClearSyncCacheClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearSyncCacheTitle'),
			message: I18N.translate('confirmClearSyncCacheMessage'),
			onConfirm: async () => {
				await BrowserStorage.remove('syncCache');
				await store.resetData();
			},
		});
	};

	const onAddDateClick = async () => {
		await EventDispatcher.dispatch('MISSING_WATCHED_DATE_DIALOG_SHOW', null, {
			items: store.data.items.filter((item) => item.isMissingWatchedDate()),
		});
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('ITEMS_LOAD', null, onItemsLoad);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('ITEMS_LOAD', null, onItemsLoad);
		};

		const onItemsLoad = () => {
			setItemsMissingWatchedDate(store.areItemsMissingWatchedDate());
		};

		startListeners();
		return stopListeners;
	}, []);

	return (
		<Box className="history-actions--container" style={{ zIndex: theme.zIndex.drawer + 1 }}>
			<Divider />
			<Box className="history-actions">
				<Button color="primary" onClick={onSyncClick} variant="contained">
					{I18N.translate('sync')}
				</Button>
				{!serviceId && (
					<Button color="secondary" onClick={onClearSyncCacheClick} variant="contained">
						{I18N.translate('clearSyncCache')}
					</Button>
				)}
				{areItemsMissingWatchedDate && (
					<Button onClick={onAddDateClick} variant="contained">
						{I18N.translate('addDate')}
					</Button>
				)}
			</Box>
		</Box>
	);
};
