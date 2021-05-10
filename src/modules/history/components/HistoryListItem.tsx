import { Box, Checkbox } from '@material-ui/core';
import { green, red } from '@material-ui/core/colors';
import SyncIcon from '@material-ui/icons/Sync';
import * as React from 'react';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import { Item } from '../../../models/Item';
import {
	StreamingServiceId,
	streamingServices,
} from '../../../streaming-services/streaming-services';
import { HistoryListItemCard } from './HistoryListItemCard';

interface HistoryListItemProps {
	dateFormat: string;
	item: Item;
	serviceId: StreamingServiceId | null;
	sendReceiveSuggestions: boolean;
}

export const HistoryListItem: React.FC<HistoryListItemProps> = (props: HistoryListItemProps) => {
	const { dateFormat, item, serviceId, sendReceiveSuggestions } = props;

	const onCheckboxChange = async () => {
		await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_CHANGE', null, {
			index: item.index,
			checked: !item.isSelected,
		});
	};

	const openMissingWatchedDateDialog = async () => {
		await EventDispatcher.dispatch('MISSING_WATCHED_DATE_DIALOG_SHOW', null, {
			serviceId,
			item,
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
			{item.trakt && !item.trakt.watchedAt && (
				<Checkbox
					checked={item.isSelected || false}
					className="history-list-item-checkbox"
					edge="start"
					onChange={onCheckboxChange}
				/>
			)}
			<HistoryListItemCard
				dateFormat={dateFormat}
				item={item}
				name={streamingServices[item.serviceId].name}
				openMissingWatchedDateDialog={openMissingWatchedDateDialog}
			/>
			<Box
				className="history-list-item-status"
				title={I18N.translate(statusMessageName)}
				style={{ backgroundColor: statusColor }}
			>
				<SyncIcon />
			</Box>
			<HistoryListItemCard
				dateFormat={dateFormat}
				item={item.trakt}
				name="Trakt"
				sendReceiveSuggestions={sendReceiveSuggestions}
				correctionSuggestions={item.correctionSuggestions}
				imageUrl={item.imageUrl}
				openWrongItemDialog={openWrongItemDialog}
			/>
		</Box>
	);
};
