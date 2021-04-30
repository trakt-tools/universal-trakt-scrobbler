import {
	Box,
	Button,
	ButtonGroup,
	Drawer,
	FormGroup,
	InputLabel,
	Toolbar,
} from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
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
	const theme = useTheme();

	return (
		<Drawer
			classes={{ paper: 'history-options-sidebar' }}
			anchor="left"
			variant="permanent"
			style={{ zIndex: theme.zIndex.appBar - 1 }}
		>
			<Toolbar />
			<FormGroup className="history-options-list-container">
				{options.map((option) => (
					<HistoryOptionsListItem key={option.id} option={option} />
				))}
				<Box className="button-group-container">
					<InputLabel shrink={true}>{I18N.translate('select')}</InputLabel>
					<ButtonGroup className="button-group" variant="contained">
						<Button onClick={() => store.selectAll()}>{I18N.translate('selectAll')}</Button>
						<Button onClick={() => store.selectNone()}>{I18N.translate('selectNone')}</Button>
						<Button onClick={() => store.toggleAll()}>{I18N.translate('toggleAll')}</Button>
					</ButtonGroup>
				</Box>
			</FormGroup>
		</Drawer>
	);
};
