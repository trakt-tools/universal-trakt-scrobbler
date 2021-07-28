import { BrowserStorage } from '@common/BrowserStorage';
import { Item } from '@models/Item';
import { SyncPage } from '@pages/SyncPage';
import { getSyncStore } from '@stores/SyncStore';
import React, { useEffect, useState } from 'react';

export const AutoSyncPage: React.FC = () => {
	const [isLoading, setLoading] = useState(true);

	useEffect(() => {
		const loadCache = async () => {
			const { syncCache } = await BrowserStorage.get('syncCache');
			if (syncCache && syncCache.items.length > 0) {
				const store = getSyncStore(null);
				const items = syncCache.items.map((savedItem) => Item.load(savedItem));
				await store.setData({ items, hasReachedEnd: true });
				setLoading(false);
			}
		};

		void loadCache();
	}, []);

	return isLoading ? null : <SyncPage serviceId={null} />;
};
