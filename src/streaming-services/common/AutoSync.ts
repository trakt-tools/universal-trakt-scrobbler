import { TraktSync } from '../../api/TraktSync';
import { BrowserStorage, StreamingServiceValue } from '../../common/BrowserStorage';
import { Item } from '../../models/Item';
import '../apis';
import { Api, getApi } from './Api';
import { getSyncStore } from './SyncStore';

class _AutoSync {
	async sync(serviceEntries: [string, StreamingServiceValue][], now: number) {
		let { syncCache } = await BrowserStorage.get('syncCache');
		if (!syncCache) {
			syncCache = {
				items: [],
				failed: false,
			};
		}

		for (const [serviceId, serviceValue] of serviceEntries) {
			let items: Item[] = [];

			try {
				const api = getApi(serviceId);
				const store = getSyncStore(serviceId);
				store.resetData();

				await api.loadHistory(Infinity, serviceValue.lastSync, serviceValue.lastSyncId);

				items = store.data.items.filter(
					(item) => item.progress >= BrowserStorage.syncOptions.minPercentageWatched
				);
				if (items.length > 0) {
					await Api.loadTraktHistory(items);

					const foundItems = items.filter((item) => item.trakt);
					const itemsToSync = foundItems.filter(
						(item) => !item.trakt?.watchedAt && !item.isMissingWatchedDate()
					);
					if (itemsToSync.length > 0) {
						for (const itemToSync of itemsToSync) {
							itemToSync.isSelected = true;
						}
						await TraktSync.sync(itemsToSync);
					}

					const missingWatchedDate = items.some((item) => item.isMissingWatchedDate());
					if (missingWatchedDate || foundItems.length !== items.length) {
						throw new Error();
					}
				}
			} catch (err) {
				syncCache.failed = true;
			}

			BrowserStorage.addOption({
				id: 'streamingServices',
				value: {
					...BrowserStorage.options.streamingServices,
					[serviceId]: {
						...BrowserStorage.options.streamingServices[serviceId],
						lastSync: now,
						lastSyncId:
							items[0]?.id ?? BrowserStorage.options.streamingServices[serviceId].lastSyncId,
					},
				},
			});
			syncCache.items.unshift(...items.map((item) => Item.save(item)));
		}

		await BrowserStorage.saveOptions({});
		await BrowserStorage.set({ syncCache }, false);
	}
}

export const AutoSync = new _AutoSync();
