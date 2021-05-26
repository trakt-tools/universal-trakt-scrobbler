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
import { BrowserStorage } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import { SyncStore } from '../../../streaming-services/common/SyncStore';
import { HistoryOptionsListItem } from './HistoryOptionsListItem';

interface HistoryOptionsListProps {
	store: SyncStore;
}

export const HistoryOptionsList: React.FC<HistoryOptionsListProps> = (
	props: HistoryOptionsListProps
) => {
	const { store } = props;
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
				{Object.values(BrowserStorage.syncOptionsDetails).map((option) => (
					<HistoryOptionsListItem key={option.id} option={option} />
				))}
				<Box className="button-group-container">
					<InputLabel shrink={true}>{I18N.translate('select')}</InputLabel>
					<ButtonGroup className="button-group" variant="contained">
						<Button onClick={() => void store.selectAll().dispatchEvent(false)}>
							{I18N.translate('selectAll')}
						</Button>
						<Button onClick={() => void store.selectNone().dispatchEvent(false)}>
							{I18N.translate('selectNone')}
						</Button>
						<Button onClick={() => void store.toggleAll().dispatchEvent(false)}>
							{I18N.translate('toggleAll')}
						</Button>
					</ButtonGroup>
				</Box>
			</FormGroup>
		</Drawer>
	);
};
