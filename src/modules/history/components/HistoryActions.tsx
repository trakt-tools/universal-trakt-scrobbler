import { Box, Button, Divider } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import * as React from 'react';
import { I18N } from '../../../common/I18N';

interface HistoryActionsProps {
	showNavigationButtons: boolean;
	hasPreviousPage: boolean;
	hasNextPage: boolean;
	hasSelectedItems: boolean;
	showClearSyncCacheButton: boolean;
	showAddDateButton: boolean;
	onPreviousPageClick: () => void;
	onNextPageClick: () => void;
	onSyncClick: () => void;
	onClearSyncCacheClick: () => void;
	onAddDateClick: () => void;
}

export const HistoryActions: React.FC<HistoryActionsProps> = (props: HistoryActionsProps) => {
	const {
		showNavigationButtons,
		hasPreviousPage,
		hasNextPage,
		hasSelectedItems,
		showClearSyncCacheButton,
		showAddDateButton,
		onPreviousPageClick,
		onNextPageClick,
		onSyncClick,
		onClearSyncCacheClick,
		onAddDateClick,
	} = props;
	const theme = useTheme();

	return (
		<Box className="history-actions--container" style={{ zIndex: theme.zIndex.appBar }}>
			<Divider />
			<Box className="history-actions">
				{showNavigationButtons && (
					<>
						<Button disabled={!hasPreviousPage} onClick={onPreviousPageClick} variant="contained">
							{I18N.translate('previousPage')}
						</Button>
						<Button disabled={!hasNextPage} onClick={onNextPageClick} variant="contained">
							{I18N.translate('nextPage')}
						</Button>
					</>
				)}
				<Button
					color="primary"
					disabled={!hasSelectedItems}
					onClick={onSyncClick}
					variant="contained"
				>
					{I18N.translate('sync')}
				</Button>
				{showClearSyncCacheButton && (
					<Button color="secondary" onClick={onClearSyncCacheClick} variant="contained">
						{I18N.translate('clearSyncCache')}
					</Button>
				)}
				{showAddDateButton && (
					<Button onClick={onAddDateClick} variant="contained">
						{I18N.translate('addDate')}
					</Button>
				)}
			</Box>
		</Box>
	);
};
