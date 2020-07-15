import { Button, ButtonGroup, FormGroup, Typography } from '@material-ui/core';
import * as React from 'react';
import { SyncOption } from '../../../../services/BrowserStorage';
import { Store } from '../../streaming-services/common/Store';
import { HistoryOptionsListItem } from './HistoryOptionsListItem';

interface HistoryOptionsListProps {
	options: SyncOption[];
	store: Store;
}

export const HistoryOptionsList: React.FC<HistoryOptionsListProps> = (
	props: HistoryOptionsListProps
) => {
	const { options, store } = props;
	return (
		<FormGroup className="history-options-list-container">
			{options.map((option) => (
				<HistoryOptionsListItem key={option.id} option={option} />
			))}
			<Typography variant="overline">{browser.i18n.getMessage('select')}</Typography>
			<ButtonGroup variant="contained">
				<Button onClick={() => store.selectAll()}>{browser.i18n.getMessage('selectAll')}</Button>
				<Button onClick={() => store.selectNone()}>{browser.i18n.getMessage('selectNone')}</Button>
				<Button onClick={() => store.toggleAll()}>{browser.i18n.getMessage('toggleAll')}</Button>
			</ButtonGroup>
		</FormGroup>
	);
};
