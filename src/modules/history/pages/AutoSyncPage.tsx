import { BrowserStorage, StorageValues } from '@common/BrowserStorage';
import { Item } from '@models/Item';
import { SyncPage } from '@pages/SyncPage';
import { getSyncStore } from '@stores/SyncStore';
import React, { useEffect, useState } from 'react';

export const AutoSyncPage: React.FC = () => {
	const [syncCache, setSyncCache] = useState<StorageValues['syncCache'] | null>(null);

	useEffect(() => {
		const getSyncCache = async () => {
			const storage = await BrowserStorage.get('syncCache');
			if (storage.syncCache && storage.syncCache.items.length > 0) {
				setSyncCache(storage.syncCache);
			}
		};

		void getSyncCache();
	}, []);

	if (syncCache) {
		const store = getSyncStore(null);
		const items = syncCache.items.map((savedItem) => Item.load(savedItem));
		store.setData({ items });
		store.data.visibleItems = store.data.items;
	}

	return <SyncPage serviceId={null} />;
};
