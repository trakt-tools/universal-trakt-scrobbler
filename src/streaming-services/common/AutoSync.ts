import { TraktSync } from '../../api/TraktSync';
import { BrowserStorage, StreamingServiceValue } from '../../common/BrowserStorage';
import { Item } from '../../models/Item';
import '../pages';
import { StreamingServiceId } from '../streaming-services';
import { Api } from './Api';
import { getApi, getSyncStore } from './common';

class _AutoSync {
	sync = async (serviceEntries: [StreamingServiceId, StreamingServiceValue][], now: number) => {
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

				await api.loadHistory(Infinity, serviceValue.lastSync, serviceValue.lastSyncId);

				items = store.data.items.filter(
					(item) =>
						typeof item.percentageWatched === 'undefined' ||
						item.percentageWatched >= BrowserStorage.syncOptions.minPercentageWatched
				);
				if (items.length > 0) {
					await Api.loadTraktHistory(items);

					const foundItems = items.filter((item) => item.trakt);
					const itemsToSync = foundItems.filter(
						(item) =>
							!item.trakt?.watchedAt &&
							(item.watchedAt || BrowserStorage.syncOptions.addWithReleaseDate)
					);
					if (itemsToSync.length > 0) {
						for (const itemToSync of itemsToSync) {
							itemToSync.isSelected = true;
						}
						await TraktSync.sync(itemsToSync);
					}

					const missingWatchedDate =
						!BrowserStorage.syncOptions.addWithReleaseDate && items.some((item) => !item.watchedAt);
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
						lastSync: items[0]?.watchedAt?.unix() ?? now,
						lastSyncId:
							items[0]?.id ?? BrowserStorage.options.streamingServices[serviceId].lastSyncId,
					},
				},
			});
			syncCache.items.unshift(...items.map((item) => Item.save(item)));
		}

		await BrowserStorage.saveOptions({});
		await BrowserStorage.set({ syncCache }, false);
	};
}

export const AutoSync = new _AutoSync();
