import { getServiceApi, ServiceApi } from '@apis/ServiceApi';
import { TraktSync } from '@apis/TraktSync';
import { BrowserAction } from '@common/BrowserAction';
import { BrowserStorage, StorageValuesOptions } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher, StorageOptionsChangeData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Utils } from '@common/Utils';
import { Item } from '@models/Item';
import { getServices, Service } from '@models/Service';
import '@services-apis';
import { getSyncStore } from '@stores/SyncStore';
import { PartialDeep } from 'type-fest';

class _AutoSync {
	isChecking = false;
	checkTimeoutId: number | null = null;

	init() {
		void this.check();
		EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
	}

	onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		if (data.options?.services) {
			const doCheck = Object.values(data.options.services).some(
				(serviceValue) =>
					serviceValue && ('autoSync' in serviceValue || 'autoSyncDays' in serviceValue)
			);
			if (doCheck) {
				void this.check();
			}
		}
	};

	async check() {
		if (this.isChecking) {
			return;
		}
		this.isChecking = true;

		if (this.checkTimeoutId !== null) {
			window.clearTimeout(this.checkTimeoutId);
		}

		const now = Math.trunc(Date.now() / 1e3);
		const servicesToSync = getServices().filter((service) => {
			const value = BrowserStorage.options.services[service.id];
			return (
				service.hasSync &&
				service.hasAutoSync &&
				value.sync &&
				value.autoSync &&
				value.autoSyncDays > 0 &&
				value.lastSync > 0 &&
				now - value.lastSync >= value.autoSyncDays * 86400
			);
		});
		if (servicesToSync.length > 0) {
			try {
				await BrowserAction.setRotatingIcon();
				await BrowserAction.setTitle(I18N.translate('autoSyncing'));
				await this.sync(servicesToSync, now);
			} catch (err) {
				Errors.error('Failed to automatically sync history.', err);
			}
			await BrowserAction.setTitle();
			await BrowserAction.setStaticIcon();
		}

		// Check again every hour
		this.checkTimeoutId = window.setTimeout(() => void this.check(), 3600000);

		this.isChecking = false;
	}

	private async sync(services: Service[], now: number) {
		let { syncCache } = await BrowserStorage.get('syncCache');
		if (!syncCache) {
			syncCache = {
				items: [],
				failed: false,
			};
		}
		let partialOptions: PartialDeep<StorageValuesOptions> = {};

		for (const service of services) {
			const serviceValue = BrowserStorage.options.services[service.id];
			let items: Item[] = [];

			try {
				const api = getServiceApi(service.id);
				const store = getSyncStore(service.id);
				await store.resetData();

				await api.loadHistory(Infinity, serviceValue.lastSync, serviceValue.lastSyncId);

				items = store.data.items.filter(
					(item) => item.progress >= BrowserStorage.syncOptions.minPercentageWatched
				);
				if (items.length > 0) {
					items = await ServiceApi.loadTraktHistory(items);

					const foundItems = items.filter((item) => item.trakt);
					const itemsToSync = foundItems.filter(
						(item) => !item.trakt?.watchedAt && !item.isMissingWatchedDate()
					);
					if (itemsToSync.length > 0) {
						for (const itemToSync of itemsToSync) {
							itemToSync.isSelected = true;
						}
						await TraktSync.sync(store, itemsToSync);
					}

					items = store.data.items.filter(
						(item) => item.progress >= BrowserStorage.syncOptions.minPercentageWatched
					);

					const missingWatchedDate = items.some((item) => item.isMissingWatchedDate());
					if (missingWatchedDate || foundItems.length !== items.length) {
						throw new Error('Items are either missing the watched date or have not been found');
					}
				}
			} catch (err) {
				syncCache.failed = true;
				Errors.log(`Failed to auto sync ${service.id}`, err);
			}

			const partialServiceValue = partialOptions.services?.[service.id] || {};
			partialServiceValue.lastSync = now;
			if (items[0]?.id) {
				partialServiceValue.lastSyncId = items[0].id;
			}
			partialOptions = Utils.mergeObjs(partialOptions, {
				services: {
					[service.id]: partialServiceValue,
				},
			});
			syncCache.items.unshift(...items.map((item) => Item.save(item)));
		}

		await BrowserStorage.saveOptions(partialOptions);
		await BrowserStorage.set({ syncCache }, false);
	}
}

export const AutoSync = new _AutoSync();
