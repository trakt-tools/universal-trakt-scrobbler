import { Box, Button, Checkbox } from '@material-ui/core';
import SyncIcon from '@material-ui/icons/Sync';
import * as React from 'react';
import { Item } from '../../../../models/Item';
import { EventDispatcher, Events } from '../../../../services/Events';
import { HistoryListItemCard } from './HistoryListItemCard';

interface HistoryListItemProps {
	dateFormat: string;
	item: Item;
	serviceName: string;
}

export const HistoryListItem: React.FC<HistoryListItemProps> = (props: HistoryListItemProps) => {
	const { dateFormat, item, serviceName } = props;

	const onCheckboxChange = async () => {
		await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_CHANGE, {
			index: item.index,
			checked: !item.isSelected,
		});
	};

	const onButtonClick = () => {
		// TODO: Implement option to correct item.
	};

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
			<Button
				className="history-list-item-button"
				color={item.trakt && 'watchedAt' in item.trakt ? 'primary' : 'default'}
				onClick={onButtonClick}
				variant="contained"
			>
				<SyncIcon />
			</Button>
			<HistoryListItemCard dateFormat={dateFormat} item={item.trakt} name="Trakt" />
		</Box>
	);
};
