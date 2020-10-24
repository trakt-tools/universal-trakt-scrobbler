import { Button, ButtonGroup, FormGroup, Typography } from '@material-ui/core';
import * as React from 'react';
import { SyncOption } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import { SyncStore } from '../../../streaming-services/common/SyncStore';
import { HistoryOptionsListItem } from './HistoryOptionsListItem';

interface HistoryOptionsListProps {
	options: SyncOption[];
	store: SyncStore;
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
			<Typography variant="overline">{I18N.translate('select')}</Typography>
			<ButtonGroup variant="contained">
				<Button onClick={() => store.selectAll()}>{I18N.translate('selectAll')}</Button>
				<Button onClick={() => store.selectNone()}>{I18N.translate('selectNone')}</Button>
				<Button onClick={() => store.toggleAll()}>{I18N.translate('toggleAll')}</Button>
			</ButtonGroup>
		</FormGroup>
	);
};
