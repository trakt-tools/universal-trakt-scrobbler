import { getServiceApi, ServiceApi } from '@apis/ServiceApi';
import { TraktSync } from '@apis/TraktSync';
import { BrowserAction } from '@common/BrowserAction';
import { StorageValuesOptions } from '@common/BrowserStorage';
import { I18N } from '@common/I18N';
import { RequestError } from '@common/RequestError';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { ScrobbleItem } from '@models/Item';
import { getServices, Service } from '@models/Service';
import '@services-apis';
import { getSyncStore } from '@stores/SyncStore';
import { PartialDeep } from 'type-fest';
import browser, { Alarms as WebExtAlarms } from 'webextension-polyfill';

class _AutoSync {
	async initFromBackground() {
		const existingAlarm = await browser.alarms.get('check-auto-sync');
		if (existingAlarm) {
			return;
		}

		browser.alarms.create('check-auto-sync', {
			delayInMinutes: 1,
			// Check again every hour
			periodInMinutes: 60,
		});
	}

	addBackgroundListeners() {
		browser.alarms.onAlarm.addListener(this.onAlarm);
	}

	private onAlarm = (alarm: WebExtAlarms.Alarm) => {
		if (alarm.name !== 'check-auto-sync') {
			return;
		}

		void this.check();
	};

	private async check() {
		await Shared.waitForInit();

		const now = Utils.unix();
		const servicesToSync = getServices().filter((service) => {
			const value = Shared.storage.options.services[service.id];
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
				if (Shared.errors.validate(err)) {
					Shared.errors.error('Failed to automatically sync history.', err);
				}
			}
			await BrowserAction.setTitle();
			await BrowserAction.setStaticIcon();
		}
	}

	private async sync(services: Service[], now: number) {
		let { syncCache } = await Shared.storage.get('syncCache');
		if (!syncCache) {
			syncCache = {
				items: [],
				failed: false,
			};
		}
		let partialOptions: PartialDeep<StorageValuesOptions> = {};

		for (const service of services) {
			let wasCanceled = false;

			const serviceValue = Shared.storage.options.services[service.id];
			let items: ScrobbleItem[] = [];

			const api = getServiceApi(service.id);
			const store = getSyncStore(service.id);

			api.reset();
			await store.resetData();

			try {
				await api.loadHistory(Infinity, serviceValue.lastSync, serviceValue.lastSyncId);

				items = store.data.items.filter(
					(item) => item.progress >= Shared.storage.syncOptions.minPercentageWatched
				);
				if (items.length > 0) {
					items = await ServiceApi.loadTraktHistory(items, undefined, 'autoSync');

					const foundItems = items.filter((item) => item.trakt);
					const itemsToSync = foundItems.filter(
						(item) => !item.trakt?.watchedAt && !item.isMissingWatchedDate()
					);
					if (itemsToSync.length > 0) {
						for (const itemToSync of itemsToSync) {
							itemToSync.isSelected = true;
						}
						await TraktSync.sync(store, itemsToSync, 'autoSync');
					}

					items = store.data.items.filter(
						(item) => item.progress >= Shared.storage.syncOptions.minPercentageWatched
					);

					const missingWatchedDate = items.some((item) => item.isMissingWatchedDate());
					if (missingWatchedDate || foundItems.length !== items.length) {
						throw new Error('Items are either missing the watched date or have not been found');
					}
				}
			} catch (err) {
				if (Shared.errors.validate(err)) {
					syncCache.failed = true;
					Shared.errors.log(`Failed to auto sync ${service.id}`, err);
				} else if (err instanceof RequestError && err.isCanceled) {
					wasCanceled = true;
				}
			}

			api.reset();
			await store.resetData();

			if (!wasCanceled) {
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
				syncCache.items.unshift(...items.map((item) => item.save()));
			}
		}

		await Shared.storage.saveOptions(partialOptions);
		await Shared.storage.set({ syncCache }, false);
	}
}

export const AutoSync = new _AutoSync();
