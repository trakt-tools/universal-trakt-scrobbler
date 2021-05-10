import { Box, Button, Divider } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import * as React from 'react';
import { I18N } from '../../../common/I18N';
import { StreamingServiceId } from '../../../streaming-services/streaming-services';

interface HistoryActionsProps {
	serviceId: StreamingServiceId | null;
	hasPreviousPage: boolean;
	hasNextPage: boolean;
	showAddDateButton: boolean;
	onPreviousPageClick: () => void;
	onNextPageClick: () => void;
	onSyncClick: () => void;
	onAddDateClick: () => void;
}

export const HistoryActions: React.FC<HistoryActionsProps> = (props: HistoryActionsProps) => {
	const {
		serviceId,
		hasPreviousPage,
		hasNextPage,
		showAddDateButton,
		onPreviousPageClick,
		onNextPageClick,
		onSyncClick,
		onAddDateClick,
	} = props;
	const theme = useTheme();

	return (
		<Box className="history-actions--container" style={{ zIndex: theme.zIndex.appBar }}>
			<Divider />
			<Box className="history-actions">
				{serviceId && (
					<>
						<Button disabled={!hasPreviousPage} onClick={onPreviousPageClick} variant="contained">
							{I18N.translate('previousPage')}
						</Button>
						<Button disabled={!hasNextPage} onClick={onNextPageClick} variant="contained">
							{I18N.translate('nextPage')}
						</Button>
					</>
				)}
				<Button color="primary" onClick={onSyncClick} variant="contained">
					{I18N.translate('sync')}
				</Button>
				{showAddDateButton && (
					<Button onClick={onAddDateClick} variant="contained">
						{I18N.translate('addDate')}
					</Button>
				)}
			</Box>
		</Box>
	);
};
