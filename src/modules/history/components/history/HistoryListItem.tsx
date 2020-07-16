import { Box, Checkbox } from '@material-ui/core';
import { green, red } from '@material-ui/core/colors';
import SyncIcon from '@material-ui/icons/Sync';
import * as React from 'react';
import { Item } from '../../../../models/Item';
import { EventDispatcher, Events } from '../../../../services/Events';
import { StreamingServiceId } from '../../../../streaming-services';
import { HistoryListItemCard } from './HistoryListItemCard';

interface HistoryListItemProps {
	dateFormat: string;
	item: Item;
	serviceId: StreamingServiceId;
	serviceName: string;
}

export const HistoryListItem: React.FC<HistoryListItemProps> = (props: HistoryListItemProps) => {
	const { dateFormat, item, serviceId, serviceName } = props;

	const onCheckboxChange = async () => {
		await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_CHANGE, null, {
			index: item.index,
			checked: !item.isSelected,
		});
	};

	const openWrongItemDialog = async () => {
		await EventDispatcher.dispatch(Events.WRONG_ITEM_DIALOG_SHOW, null, {
			serviceId,
			item,
		});
	};

	const [statusColor, statusMessageName] =
		item.trakt && 'watchedAt' in item.trakt && item.trakt.watchedAt
			? [green[500], 'itemSynced']
			: [red[500], 'itemNotSynced'];

	return (
		<Box className="history-list-item">
			{item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt && (
				<Checkbox
					checked={item.isSelected || false}
					className="history-list-item-checkbox"
					edge="start"
					onChange={onCheckboxChange}
				/>
			)}
			<HistoryListItemCard dateFormat={dateFormat} item={item} name={serviceName} />
			<Box
				className="history-list-item-status"
				title={browser.i18n.getMessage(statusMessageName)}
				style={{ backgroundColor: statusColor }}
			>
				<SyncIcon />
			</Box>
			<HistoryListItemCard
				dateFormat={dateFormat}
				item={item.trakt}
				name="Trakt"
				openWrongItemDialog={openWrongItemDialog}
			/>
		</Box>
	);
};
