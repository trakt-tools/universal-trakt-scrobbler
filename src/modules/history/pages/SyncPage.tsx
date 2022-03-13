import { CorrectionDialog } from '@components/CorrectionDialog';
import { HistoryActions } from '@components/HistoryActions';
import { HistoryList } from '@components/HistoryList';
import { HistoryOptionsList } from '@components/HistoryOptionsList';
import { MissingWatchedDateDialog } from '@components/MissingWatchedDateDialog';

export const SyncPage = (): JSX.Element => {
	return (
		<>
			<MissingWatchedDateDialog />
			<CorrectionDialog />
			<HistoryOptionsList />
			<HistoryList />
			<HistoryActions />
		</>
	);
};
