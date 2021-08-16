import { EventDispatcher, ItemsLoadData } from '@common/Events';
import { I18N } from '@common/I18N';
import { HistoryListItemCard } from '@components/HistoryListItemCard';
import { useSync } from '@contexts/SyncContext';
import { Box, Button, Checkbox, Tooltip, Typography } from '@material-ui/core';
import { green, red } from '@material-ui/core/colors';
import SyncIcon from '@material-ui/icons/Sync';
import { Item } from '@models/Item';
import { getService } from '@models/Service';
import React, { useEffect, useState } from 'react';
import { areEqual, ListChildComponentProps } from 'react-window';

export interface HistoryListItemProps {
	onContinueLoadingClick: () => Promise<void>;
}

const _HistoryListItem: React.FC<ListChildComponentProps<HistoryListItemProps>> = ({
	data,
	index,
	style,
}) => {
	const { serviceId, store } = useSync();

	const { onContinueLoadingClick } = data;

	if (!serviceId) {
		index -= 1;
	}
	const [item, setItem] = useState<Item | null | undefined>(store.data.items[index] ?? undefined);

	const onCheckboxChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!item) {
			return;
		}
		const newItem = item.clone();
		newItem.isSelected = event.target.checked;
		await store.update([newItem], false);
		setItem(newItem);
	};

	const openMissingWatchedDateDialog = async () => {
		if (!item) {
			return;
		}
		await EventDispatcher.dispatch('MISSING_WATCHED_DATE_DIALOG_SHOW', null, {
			items: [item],
		});
	};

	const openCorrectionDialog = async () => {
		if (!item) {
			return;
		}
		await EventDispatcher.dispatch('CORRECTION_DIALOG_SHOW', null, {
			item,
			isScrobblingItem: false,
		});
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('ITEMS_LOAD', null, onItemsLoad);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('ITEMS_LOAD', null, onItemsLoad);
		};

		const onItemsLoad = (eventData: ItemsLoadData) => {
			if (index in eventData.items) {
				const newItem = eventData.items[index];
				setItem(newItem);
			}
		};

		startListeners();
		return stopListeners;
	}, []);

	const [statusColor, statusMessageName]: [string, MessageName] = item?.trakt?.watchedAt
		? [green[500], 'itemSynced']
		: [red[500], 'itemNotSynced'];
	let serviceName;
	if (item?.serviceId) {
		serviceName = getService(item.serviceId).name;
	} else if (serviceId) {
		serviceName = getService(serviceId).name;
	} else {
		serviceName = I18N.translate('unknown');
	}

	return item?.isHidden ? null : index === -1 ? (
		<Box className="history-list-item" style={style}>
			<Box className="history-list-item-message" p={2}>
				<Typography variant="body1">{I18N.translate('autoSyncPageMessage')}</Typography>
			</Box>
		</Box>
	) : index === store.data.items.length && store.data.hasReachedEnd ? (
		<Box className="history-list-item" style={style}>
			<Box className="history-list-item-message" p={2}>
				{store.data.hasReachedLastSyncDate ? (
					<>
						<Box mb={2}>
							<Typography variant="body1">{I18N.translate('reachedLastSyncDate')}</Typography>
						</Box>
						<Button color="primary" onClick={onContinueLoadingClick} variant="contained">
							{I18N.translate('continueLoading')}
						</Button>
					</>
				) : (
					<Typography variant="body1">{I18N.translate('reachedHistoryEnd')}</Typography>
				)}
			</Box>
		</Box>
	) : (
		<Box className="history-list-item" style={style}>
			<Checkbox
				disabled={!item?.isSelectable()}
				checked={item?.isSelected || false}
				className="history-list-item-checkbox"
				edge="start"
				onChange={onCheckboxChange}
			/>
			<HistoryListItemCard
				isLoading={item?.isLoading ?? true}
				item={item}
				name={serviceName}
				openMissingWatchedDateDialog={openMissingWatchedDateDialog}
			/>
			<Tooltip title={I18N.translate(statusMessageName)}>
				<Box className="history-list-item-status" style={{ backgroundColor: statusColor }}>
					<SyncIcon />
				</Box>
			</Tooltip>
			<HistoryListItemCard
				isLoading={item?.isLoading ?? true}
				item={item?.trakt}
				name="Trakt"
				suggestions={item?.suggestions}
				imageUrl={item?.imageUrl}
				openCorrectionDialog={openCorrectionDialog}
			/>
		</Box>
	);
};

export const HistoryListItem = React.memo(_HistoryListItem, areEqual);
