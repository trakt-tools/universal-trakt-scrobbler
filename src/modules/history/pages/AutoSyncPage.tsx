import { Shared } from '@common/Shared';
import { useSync } from '@contexts/SyncContext';
import { createScrobbleItem } from '@models/Item';
import { SyncPage } from '@pages/SyncPage';
import { useEffect, useState } from 'react';

export const AutoSyncPage = (): JSX.Element => {
	const { store } = useSync();

	const [isLoading, setLoading] = useState(true);

	useEffect(() => {
		const loadCache = async () => {
			const { syncCache } = await Shared.storage.get('syncCache');
			if (syncCache && syncCache.items.length > 0) {
				const items = syncCache.items.map((savedItem) => createScrobbleItem(savedItem));
				await store.setData({ items, hasReachedEnd: true });
				setLoading(false);
			}
		};

		void loadCache();
	}, []);

	return <>{!isLoading && <SyncPage />}</>;
};
