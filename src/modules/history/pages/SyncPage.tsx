import { getServiceApi } from '@apis/ServiceApi';
import { CorrectionDialog } from '@components/CorrectionDialog';
import { HistoryActions } from '@components/HistoryActions';
import { HistoryList } from '@components/HistoryList';
import { HistoryOptionsList } from '@components/HistoryOptionsList';
import { MissingWatchedDateDialog } from '@components/MissingWatchedDateDialog';
import { SyncDialog } from '@components/SyncDialog';
import { getService } from '@models/Service';
import { getSyncStore } from '@stores/SyncStore';
import PropTypes from 'prop-types';
import React from 'react';

interface PageProps {
	serviceId: string | null;
}

export const SyncPage: React.FC<PageProps> = (props: PageProps) => {
	const { serviceId } = props;

	const service = serviceId ? getService(serviceId) : null;
	const store = getSyncStore(serviceId);
	const api = serviceId ? getServiceApi(serviceId) : null;

	return (
		<>
			<HistoryOptionsList store={store} />
			<HistoryList serviceId={serviceId} service={service} api={api} store={store} />
			<HistoryActions serviceId={serviceId} store={store} />
			<SyncDialog />
			<MissingWatchedDateDialog />
			<CorrectionDialog />
		</>
	);
};

SyncPage.propTypes = {
	serviceId: PropTypes.any,
};
