import { Box, Checkbox, Tooltip } from '@material-ui/core';
import { green, red } from '@material-ui/core/colors';
import SyncIcon from '@material-ui/icons/Sync';
import * as React from 'react';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import { Item } from '../../../models/Item';
import { streamingServices } from '../../../streaming-services/streaming-services';
import { HistoryListItemCard } from './HistoryListItemCard';

interface HistoryListItemProps {
	item: Item;
	serviceId: string | null;
}

export const HistoryListItem: React.FC<HistoryListItemProps> = (props: HistoryListItemProps) => {
	const { item, serviceId } = props;

	const onCheckboxChange = async () => {
		await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_CHANGE', null, {
			index: item.index,
			checked: !item.isSelected,
		});
	};

	const openMissingWatchedDateDialog = async () => {
		await EventDispatcher.dispatch('MISSING_WATCHED_DATE_DIALOG_SHOW', null, {
			serviceId,
			items: [item],
		});
	};

	const openWrongItemDialog = async () => {
		await EventDispatcher.dispatch('WRONG_ITEM_DIALOG_SHOW', null, {
			serviceId,
			item,
		});
	};

	const [statusColor, statusMessageName]: [string, MessageName] = item.trakt?.watchedAt
		? [green[500], 'itemSynced']
		: [red[500], 'itemNotSynced'];

	return (
		<Box className="history-list-item">
			{item.isSelectable() && (
				<Checkbox
					checked={item.isSelected || false}
					className="history-list-item-checkbox"
					edge="start"
					onChange={onCheckboxChange}
				/>
			)}
			<HistoryListItemCard
				item={item}
				name={streamingServices[item.serviceId].name}
				openMissingWatchedDateDialog={openMissingWatchedDateDialog}
			/>
			<Tooltip title={I18N.translate(statusMessageName)}>
				<Box className="history-list-item-status" style={{ backgroundColor: statusColor }}>
					<SyncIcon />
				</Box>
			</Tooltip>
			<HistoryListItemCard
				item={item.trakt}
				name="Trakt"
				correctionSuggestions={item.correctionSuggestions}
				imageUrl={item.imageUrl}
				openWrongItemDialog={openWrongItemDialog}
			/>
		</Box>
	);
};
