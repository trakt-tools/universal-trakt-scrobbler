import { Box, Button, Divider } from '@material-ui/core';
import * as React from 'react';
import { I18N } from '../../../common/I18N';

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
					{I18N.translate('nextPage')}
				</Button>
				<Button color="primary" onClick={onSyncClick} variant="contained">
					{I18N.translate('sync')}
				</Button>
			</Box>
		</Box>
	);
};
