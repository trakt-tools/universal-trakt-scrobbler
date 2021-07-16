import { HistoryListItem } from '@components/HistoryListItem';
import { MissingWatchedDateDialog } from '@components/MissingWatchedDateDialog';
import { WrongItemDialog } from '@components/WrongItemDialog';
import { List } from '@material-ui/core';
import { Item } from '@models/Item';
import * as React from 'react';

interface HistoryListProps {
	items: Item[];
	serviceId: string | null;
}

export const HistoryList: React.FC<HistoryListProps> = (props: HistoryListProps) => {
	const { items, serviceId } = props;

	return (
		<>
			<List className="history-list">
				{items.map((item) => (
					<HistoryListItem key={item.index} item={item} serviceId={serviceId} />
				))}
			</List>
			<MissingWatchedDateDialog />
			<WrongItemDialog />
		</>
	);
};
