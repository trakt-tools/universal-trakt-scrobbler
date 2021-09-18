import { CorrectionDialog } from '@components/CorrectionDialog';
import { HistoryActions } from '@components/HistoryActions';
import { HistoryList } from '@components/HistoryList';
import { HistoryOptionsList } from '@components/HistoryOptionsList';
import { MissingWatchedDateDialog } from '@components/MissingWatchedDateDialog';
import { SyncDialog } from '@components/SyncDialog';

export const SyncPage = (): JSX.Element => {
	return (
		<>
			<HistoryOptionsList />
			<HistoryList />
			<HistoryActions />
			<SyncDialog />
			<MissingWatchedDateDialog />
			<CorrectionDialog />
		</>
	);
};
