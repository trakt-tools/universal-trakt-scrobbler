import { Box, Button, Divider } from '@material-ui/core';
import * as React from 'react';

interface HistoryActionsProps {
	onNextPageClick: () => void;
	onSyncClick: () => void;
}

export const HistoryActions: React.FC<HistoryActionsProps> = (props: HistoryActionsProps) => {
	const { onNextPageClick, onSyncClick } = props;
	return (
		<Box className="history-actions--container">
			<Divider />
			<Box className="history-actions">
				<Button onClick={onNextPageClick} variant="contained">
					{browser.i18n.getMessage('nextPage')}
				</Button>
				<Button color="primary" onClick={onSyncClick} variant="contained">
					{browser.i18n.getMessage('sync')}
				</Button>
			</Box>
		</Box>
	);
};
