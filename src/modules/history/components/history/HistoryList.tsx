import { List } from '@material-ui/core';
import * as React from 'react';
import { HistoryListItem } from './HistoryListItem';
import { Item } from '../../../../models/Item';

interface HistoryListProps {
	dateFormat: string;
	items: Item[];
	serviceName: string;
}

const HistoryList: React.FC<HistoryListProps> = (props: HistoryListProps) => {
	const { dateFormat, items, serviceName } = props;
	return (
		<List>
			{items.map((item) => (
				<HistoryListItem
					key={item.index}
					dateFormat={dateFormat}
					item={item}
					serviceName={serviceName}
				/>
			))}
		</List>
	);
};

export { HistoryList };
