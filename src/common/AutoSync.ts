import { getServiceApi, ServiceApi } from '@apis/ServiceApi';
import { TraktSync } from '@apis/TraktSync';
import { BrowserStorage, ServiceValue } from '@common/BrowserStorage';
import { Item } from '@models/Item';
import '@services-apis';
import { getSyncStore } from '@stores/SyncStore';

class _AutoSync {
	async sync(serviceEntries: [string, ServiceValue][], now: number) {
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
				const api = getServiceApi(serviceId);
				const store = getSyncStore(serviceId);
				store.resetData();

				await api.loadHistory(Infinity, serviceValue.lastSync, serviceValue.lastSyncId);

				items = store.data.items.filter(
					(item) => item.progress >= BrowserStorage.syncOptions.minPercentageWatched
				);
				if (items.length > 0) {
					await ServiceApi.loadTraktHistory(items);

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
				id: 'services',
				value: {
					...BrowserStorage.options.services,
					[serviceId]: {
						...BrowserStorage.options.services[serviceId],
						lastSync: now,
						lastSyncId: items[0]?.id ?? BrowserStorage.options.services[serviceId].lastSyncId,
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
