import * as React from 'react';
import { useEffect, useState } from 'react';
import { BrowserStorage, StorageValues } from '../../../common/BrowserStorage';
import { Item } from '../../../models/Item';
import { getSyncStore } from '../../../streaming-services/common/common';
import { SyncPage } from './SyncPage';

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

	return syncCache ? <SyncPage serviceId={null} /> : null;
};
