import { HboGoApiParams } from '@/hbo-go/HboGoApi';
import { Suggestion } from '@apis/CorrectionApi';
import { TraktAuthDetails } from '@apis/TraktAuth';
import { CacheStorageValues } from '@common/Cache';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { SavedItem } from '@models/Item';
import { getService, getServices } from '@models/Service';
import { SavedTraktItem } from '@models/TraktItem';
import '@services';
import React from 'react';
import { PartialDeep } from 'type-fest';
import { browser, Manifest as WebExtManifest } from 'webextension-polyfill-ts';

export type StorageValues = StorageValuesV6;
export type StorageValuesOptions = StorageValuesOptionsV3;
export type StorageValuesSyncOptions = StorageValuesSyncOptionsV2;

export type StorageValuesV6 = {
	version?: 6;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV3;
	syncOptions?: StorageValuesSyncOptionsV2;
	syncCache?: SyncCacheValue;
	corrections?: Partial<Record<string, Suggestion>>;
	scrobblingDetails?: ScrobblingDetails;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
} & CacheStorageValues;

export type StorageValuesV5 = {
	version?: 5;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV3;
	syncOptions?: StorageValuesSyncOptionsV2;
	syncCache?: SyncCacheValue;
	corrections?: Partial<Record<string, Suggestion>>;
	scrobblingItem?: Omit<SavedItem, ''>;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
} & CacheStorageValues;

export type StorageValuesV4 = {
	version?: 4;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV3;
	syncOptions?: StorageValuesSyncOptionsV2;
	traktCache?: Record<string, Omit<SavedTraktItem, ''>>;
	syncCache?: SyncCacheValue;
	corrections?: Partial<Record<string, Suggestion>>;
	scrobblingItem?: Omit<SavedItem, ''>;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
};

export type StorageValuesV3 = {
	version?: 3;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV3;
	syncOptions?: StorageValuesSyncOptionsV2;
	traktCache?: Record<string, Omit<SavedTraktItem, ''>>;
	syncCache?: SyncCacheValue;
	correctItems?: Partial<Record<string, Record<string, CorrectItem>>>;
	scrobblingItem?: Omit<SavedItem, ''>;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
};

export type StorageValuesV2 = {
	version?: 2;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV2;
	syncOptions?: StorageValuesSyncOptionsV2;
	traktCache?: Record<string, Omit<SavedTraktItem, ''>>;
	syncCache?: SyncCacheValue;
	correctItems?: Partial<Record<string, Record<string, CorrectItem>>>;
	scrobblingItem?: Omit<SavedItem, ''>;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
};

export type StorageValuesV1 = {
	version?: 1;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV1;
	syncOptions?: StorageValuesSyncOptionsV1;
	traktCache?: unknown;
	correctUrls?: Partial<Record<string, Record<string, string>>>;
	scrobblingItem?: unknown;
	scrobblingTabId?: number;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
};

export interface ScrobblingDetails {
	item: SavedItem;
	tabId: number | null;
	isPaused: boolean;
}

export type StorageValuesOptionsV3 = {
	services: Record<string, ServiceValue>;
	showNotifications: boolean;
	sendReceiveSuggestions: boolean;
	theme: ThemeValue;
	allowRollbar: boolean;
	grantCookies: boolean;
};

export type StorageValuesOptionsV2 = {
	streamingServices: Record<string, ServiceValue>;
	showNotifications: boolean;
	sendReceiveSuggestions: boolean;
	theme: ThemeValue;
	allowRollbar: boolean;
	grantCookies: boolean;
};

export type StorageValuesOptionsV1 = {
	streamingServices: Record<string, boolean>;
	disableScrobbling: boolean;
	showNotifications: boolean;
	sendReceiveSuggestions: boolean;
	allowRollbar: boolean;
	grantCookies: boolean;
};

export type ServiceValue = {
	scrobble: boolean;
	sync: boolean;
	autoSync: boolean;
	autoSyncDays: number;
	lastSync: number;
	lastSyncId: string;
};

export type ThemeValue = 'light' | 'dark' | 'system';

export type StorageValuesSyncOptionsV2 = {
	addWithReleaseDate: boolean;
	addWithReleaseDateMissing: boolean;
	hideSynced: boolean;
	itemsPerLoad: number;
	minPercentageWatched: number;
};

export type StorageValuesSyncOptionsV1 = {
	addWithReleaseDate: boolean;
	hideSynced: boolean;
	itemsPerLoad: number;
};

export type SyncCacheValue = {
	items: Omit<SavedItem, ''>[];
	failed: boolean;
};

export type CorrectItem = {
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
};

export type Options = {
	[K in keyof StorageValuesOptions]: Option<K>;
};

export type Option<K extends keyof StorageValuesOptions> =
	| SwitchOption<K>
	| SelectOption<K>
	| ListOption<K>;

export type BaseOption<K extends keyof StorageValuesOptions> = {
	id: K;
	name: string;
	description: React.ReactElement | string;
	value: StorageValuesOptions[K];
	origins: string[];
	permissions: WebExtManifest.OptionalPermission[];
	doShow: boolean;
};

export interface SwitchOption<K extends keyof StorageValuesOptions> extends BaseOption<K> {
	type: 'switch';
}

export interface SelectOption<K extends keyof StorageValuesOptions> extends BaseOption<K> {
	type: 'select';
	selectItems: Record<string, string>;
}

export interface ListOption<K extends keyof StorageValuesOptions> extends BaseOption<K> {
	type: 'list';
}

export type SyncOptions = {
	[K in keyof StorageValuesSyncOptions]: SyncOption<K>;
};

export type SyncOption<K extends keyof StorageValuesSyncOptions> = {
	id: K;
	name: string;
	value: StorageValuesSyncOptions[K];
	minValue?: number;
	maxValue?: number;
	dependencies?: (keyof StorageValuesSyncOptions)[];
};

export type BrowserStorageSetValues = Omit<StorageValues, 'options' | 'syncOptions'>;

export type BrowserStorageRemoveKey = Exclude<keyof StorageValues, 'options' | 'syncOptions'>;

class _BrowserStorage {
	readonly currentVersion = 6;

	isSyncAvailable: boolean;
	options = {} as StorageValuesOptions;
	optionsDetails = {} as Options;
	syncOptions = {} as StorageValuesSyncOptions;
	syncOptionsDetails = {} as SyncOptions;

	constructor() {
		this.isSyncAvailable = !!browser.storage.sync;
	}

	async init() {
		if (Shared.pageType !== 'background') {
			Shared.tabId = await Messaging.toExtension({ action: 'get-tab-id' });
		}
		await this.sync();
		await this.upgradeOrDowngrade();
		await this.loadOptions();
		await this.loadSyncOptions();
	}

	async upgradeOrDowngrade() {
		const { version = 1 } = await this.get('version');

		console.log(`Current storage version: v${version.toString()}`);

		if (version < this.currentVersion) {
			await this.upgrade(version);
		} else if (version > this.currentVersion) {
			await this.downgrade(version);
		}
	}

	/**
	 * `objectVX` and `objectVY` are always the same object.
	 * They are only separated by type, to make it easier to understand the upgrade process.
	 */
	async upgrade(version: number) {
		if (version < 2 && this.currentVersion >= 2) {
			console.log('Upgrading to v2...');

			await this.doRemove(
				['traktCache', 'correctUrls', 'scrobblingItem'] as unknown as (keyof StorageValues)[],
				true
			);

			const values = await this.get('options');

			const optionsV1 = values.options as Partial<StorageValuesOptionsV1> | undefined;
			const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
			if (optionsV1 && optionsV2) {
				if (optionsV1.streamingServices && optionsV2.streamingServices) {
					for (const [id, value] of Object.entries(optionsV1.streamingServices)) {
						if (typeof value !== 'boolean') {
							continue;
						}

						optionsV2.streamingServices[id] = {
							scrobble: value,
							sync: value,
							autoSync: false,
							autoSyncDays: 0,
							lastSync: 0,
							lastSyncId: '',
						};
					}
				}

				delete optionsV1.disableScrobbling;

				await this.doSet({ options: optionsV2 as unknown as StorageValuesOptions }, true);
			}
		}

		if (version < 3 && this.currentVersion >= 3) {
			console.log('Upgrading to v3...');

			const values = await this.get('options');

			const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
			const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
			if (optionsV2 && optionsV3) {
				optionsV3.services = optionsV2.streamingServices;

				delete optionsV2.streamingServices;

				await this.doSet({ options: optionsV3 as unknown as StorageValuesOptions }, true);
			}
		}

		if (version < 4 && this.currentVersion >= 4) {
			console.log('Upgrading to v4...');

			await this.doRemove(['correctItems'] as unknown as (keyof StorageValues)[], true);
		}

		if (version < 5 && this.currentVersion >= 5) {
			console.log('Upgrading to v5...');

			await this.doRemove(['traktCache'] as unknown as (keyof StorageValues)[], true);
		}

		if (version < 6 && this.currentVersion >= 6) {
			console.log('Upgrading to v6...');

			await this.doRemove(['scrobblingItem'] as unknown as (keyof StorageValues)[], true);
		}

		await this.set({ version: this.currentVersion }, true);

		console.log('Upgraded!');
	}

	/**
	 * `objectVX` and `objectVY` are always the same object.
	 * They are only separated by type, to make it easier to understand the downgrade process.
	 */
	async downgrade(version: number) {
		if (version > 5 && this.currentVersion <= 5) {
			console.log('Downgrading to v5...');

			await this.doRemove(['scrobblingDetails'] as unknown as (keyof StorageValues)[], true);
		}

		if (version > 4 && this.currentVersion <= 4) {
			console.log('Downgrading to v4...');

			await this.doRemove(
				[
					'imageUrlsCache',
					'itemsToTraktItemsCache',
					'suggestionsCache',
					'tmdbApiConfigsCache',
					'traktHistoryItemsCache',
					'traktItemsCache',
					'urlsToTraktItemsCache',
				] as unknown as (keyof StorageValues)[],
				true
			);
		}

		if (version > 3 && this.currentVersion <= 3) {
			console.log('Downgrading to v3...');

			await this.doRemove(['corrections'] as unknown as (keyof StorageValues)[], true);
		}

		if (version > 2 && this.currentVersion <= 2) {
			console.log('Downgrading to v2...');

			const values = await this.get('options');

			const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
			const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
			if (optionsV2 && optionsV3) {
				optionsV2.streamingServices = optionsV3.services;

				delete optionsV3.services;

				await this.doSet({ options: optionsV2 as unknown as StorageValuesOptions }, true);
			}
		}

		if (version > 1 && this.currentVersion <= 1) {
			console.log('Downgrading to v1...');

			await this.doRemove(
				[
					'traktCache',
					'syncCache',
					'correctItems',
					'scrobblingItem',
				] as unknown as (keyof StorageValues)[],
				true
			);

			const values = await this.get(['options', 'syncOptions']);

			const optionsV1 = values.options as Partial<StorageValuesOptionsV1> | undefined;
			const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
			if (optionsV1 && optionsV2) {
				if (optionsV1.streamingServices && optionsV2.streamingServices) {
					for (const [id, value] of Object.entries(optionsV2.streamingServices)) {
						if (typeof value === 'boolean') {
							continue;
						}

						optionsV1.streamingServices[id] = value.scrobble || value.sync;
					}
				}

				delete optionsV2.theme;

				await this.doSet({ options: optionsV1 as unknown as StorageValuesOptions }, true);
			}

			const syncOptionsV1 = values.syncOptions as Partial<StorageValuesSyncOptionsV1> | undefined;
			const syncOptionsV2 = values.syncOptions as Partial<StorageValuesSyncOptionsV2> | undefined;
			if (syncOptionsV1 && syncOptionsV2) {
				delete syncOptionsV2.addWithReleaseDateMissing;
				delete syncOptionsV2.minPercentageWatched;

				await this.doSet(
					{ syncOptions: syncOptionsV1 as unknown as StorageValuesSyncOptions },
					true
				);
			}
		}

		await this.set({ version: this.currentVersion }, true);

		console.log('Downgraded!');
	}

	async sync(): Promise<void> {
		if (this.isSyncAvailable) {
			const values = (await browser.storage.sync.get()) as StorageValues;
			for (const key of Object.keys(values) as (keyof StorageValues)[]) {
				await browser.storage.local.set({ [key]: values[key] });
			}
		}
	}

	async set(values: BrowserStorageSetValues, doSync: boolean): Promise<void> {
		return this.doSet(values, doSync);
	}

	private async doSet(values: StorageValues, doSync: boolean): Promise<void> {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.set(values);
		}
		await browser.storage.local.set(values);
	}

	get(keys?: keyof StorageValues | (keyof StorageValues)[] | null): Promise<StorageValues> {
		return browser.storage.local.get(keys);
	}

	async remove(
		keys: BrowserStorageRemoveKey | BrowserStorageRemoveKey[],
		doSync = false
	): Promise<void> {
		return this.doRemove(keys, doSync);
	}

	private async doRemove(
		keys: keyof StorageValues | (keyof StorageValues)[],
		doSync = false
	): Promise<void> {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.remove(keys);
		}
		await browser.storage.local.remove(keys);
	}

	async clear(doSync: boolean): Promise<void> {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.clear();
		}
		await browser.storage.local.clear();
		await this.reset();
		void EventDispatcher.dispatch('STORAGE_OPTIONS_CHANGE', null, {
			options: this.options,
			syncOptions: this.syncOptions,
		});
		void EventDispatcher.dispatch('STORAGE_OPTIONS_CLEAR', null, {});
	}

	async reset() {
		this.options = {} as StorageValuesOptions;
		this.syncOptions = {} as StorageValuesSyncOptions;
		await this.loadOptions();
		await this.loadSyncOptions();
	}

	async getSize(keys?: keyof StorageValues | (keyof StorageValues)[] | null): Promise<string> {
		let size = '';
		const values = await this.get(keys);
		let bytes = (JSON.stringify(values) || '').length;
		if (bytes < 1024) {
			size = `${bytes.toFixed(2)} B`;
		} else {
			bytes /= 1024;
			if (bytes < 1024) {
				size = `${bytes.toFixed(2)} KB`;
			} else {
				bytes /= 1024;
				size = `${bytes.toFixed(2)} MB`;
			}
		}
		return size;
	}

	async loadOptions(): Promise<void> {
		this.optionsDetails = {
			services: {
				type: 'list',
				id: 'services',
				name: '',
				description: '',
				value: Object.fromEntries(
					getServices().map((service) => [
						service.id,
						{
							scrobble: false,
							sync: false,
							autoSync: false,
							autoSyncDays: 7,
							lastSync: 0,
							lastSyncId: '',
						},
					])
				),
				origins: [],
				permissions: [],
				doShow: true,
			},
			showNotifications: {
				type: 'switch',
				id: 'showNotifications',
				name: '',
				description: '',
				value: false,
				origins: [],
				permissions: ['notifications'],
				doShow: true,
			},
			sendReceiveSuggestions: {
				type: 'switch',
				id: 'sendReceiveSuggestions',
				name: '',
				description: '',
				value: false,
				origins: [],
				permissions: [],
				doShow: true,
			},
			theme: {
				type: 'select',
				id: 'theme',
				name: '',
				description: '',
				selectItems: {
					light: I18N.translate('lightTheme'),
					dark: I18N.translate('darkTheme'),
					system: I18N.translate('systemTheme'),
				},
				value: 'system',
				origins: [],
				permissions: [],
				doShow: true,
			},
			allowRollbar: {
				type: 'switch',
				id: 'allowRollbar',
				name: '',
				description: '',
				value: false,
				origins: ['*://api.rollbar.com/*'],
				permissions: [],
				doShow: true,
			},
			grantCookies: {
				type: 'switch',
				id: 'grantCookies',
				name: '',
				description: '',
				value: false,
				origins: [],
				permissions: ['cookies', 'webRequest', 'webRequestBlocking'],
				doShow: Shared.browser === 'firefox',
			},
		};
		const values = await this.get('options');
		if (values.options) {
			this.options = values.options;
		}
		for (const option of Object.values(this.optionsDetails)) {
			option.name = I18N.translate(`${option.id}Name` as MessageName);
			if (!option.description) {
				option.description = I18N.translate(`${option.id}Description` as MessageName);
			}
			option.value =
				typeof this.options[option.id] !== 'undefined' ? this.options[option.id] : option.value;
			if (option.id === 'services') {
				const missingServices = Object.fromEntries(
					getServices()
						.filter((service) => !(service.id in option.value))
						.map((service) => [
							service.id,
							{
								scrobble: false,
								sync: false,
								autoSync: false,
								autoSyncDays: 7,
								lastSync: 0,
								lastSyncId: '',
							},
						])
				);
				option.value = Utils.mergeObjs(option.value, missingServices);
			}
			this.options[option.id] = option.value as never;
		}
	}

	saveOptions(partialOptions: PartialDeep<StorageValuesOptions>) {
		const options = Utils.mergeObjs(this.options, partialOptions);
		const permissionPromises: Promise<boolean>[] = [];

		for (const [id, value] of Object.entries(partialOptions) as [
			keyof StorageValuesOptions,
			PartialDeep<StorageValuesOptions>[keyof StorageValuesOptions]
		][]) {
			if (!value) {
				continue;
			}

			const optionDetails = this.optionsDetails[id];
			if (optionDetails.permissions || optionDetails.origins) {
				if (value) {
					permissionPromises.push(
						browser.permissions.request({
							permissions: optionDetails.permissions || [],
							origins: optionDetails.origins || [],
						})
					);
				} else {
					permissionPromises.push(
						browser.permissions.remove({
							permissions: optionDetails.permissions || [],
							origins: optionDetails.origins || [],
						})
					);
				}
			}
		}

		if (partialOptions.services) {
			const originsToAdd = [];
			const originsToRemove = [];

			for (const [id, value] of Object.entries(partialOptions.services)) {
				if (!value || (!('scrobble' in value) && !('sync' in value))) {
					continue;
				}

				const service = getService(id);
				if (value.scrobble || value.sync) {
					originsToAdd.push(...service.hostPatterns);
				} else {
					originsToRemove.push(...service.hostPatterns);
				}
			}

			if (originsToAdd.length > 0 || originsToRemove.length > 0) {
				const scrobblerEnabled = getServices().some(
					(service) => service.hasScrobbler && options.services[service.id].scrobble
				);
				if (originsToAdd.length > 0) {
					permissionPromises.push(
						browser.permissions.request({
							permissions: scrobblerEnabled ? ['tabs'] : [],
							origins: originsToAdd,
						})
					);
				}
				if (originsToRemove.length > 0) {
					permissionPromises.push(
						browser.permissions.remove({
							permissions: scrobblerEnabled ? [] : ['tabs'],
							origins: originsToRemove,
						})
					);
				}
			}
		}

		if (permissionPromises.length === 0) {
			permissionPromises.push(Promise.resolve(true));
		}

		return Promise.all(permissionPromises).then(async (isSuccessArr) => {
			if (isSuccessArr.every((isSuccess) => isSuccess)) {
				await this.doSet({ options }, true);
				this.updateOptions(partialOptions);
				void EventDispatcher.dispatch('STORAGE_OPTIONS_CHANGE', null, {
					options: partialOptions,
				});
			} else {
				throw new Error('Permissions not granted');
			}
		});
	}

	updateOptions(options: PartialDeep<StorageValuesOptions>) {
		this.options = Utils.mergeObjs(this.options, options);
		this.optionsDetails = Utils.mergeObjs(
			this.optionsDetails,
			Object.fromEntries(Object.entries(this.options).map(([id, value]) => [id, { value }]))
		);
	}

	isServiceOption(
		option: PartialDeep<Option<keyof StorageValuesOptions>>
	): option is Option<'services'> {
		return option.id === 'services';
	}

	async loadSyncOptions(): Promise<void> {
		this.syncOptionsDetails = {
			hideSynced: {
				id: 'hideSynced',
				name: '',
				value: false,
			},
			addWithReleaseDate: {
				id: 'addWithReleaseDate',
				name: '',
				value: false,
			},
			addWithReleaseDateMissing: {
				id: 'addWithReleaseDateMissing',
				name: '',
				value: false,
				dependencies: ['addWithReleaseDate'],
			},
			itemsPerLoad: {
				id: 'itemsPerLoad',
				name: '',
				value: 10,
				minValue: 1,
			},
			minPercentageWatched: {
				id: 'minPercentageWatched',
				name: '',
				value: 75,
				minValue: 0,
				maxValue: 100,
			},
		};
		const values = await this.get('syncOptions');
		if (values.syncOptions) {
			this.syncOptions = values.syncOptions;
		}
		for (const option of Object.values(this.syncOptionsDetails)) {
			option.name = I18N.translate(`${option.id}Name` as MessageName);
			option.value =
				typeof this.syncOptions[option.id] !== 'undefined'
					? this.syncOptions[option.id]
					: option.value;
			if (typeof option.value === 'number') {
				if (typeof option.minValue !== 'undefined') {
					option.value = Math.max(option.value, option.minValue);
				}
				if (typeof option.maxValue !== 'undefined') {
					option.value = Math.min(option.value, option.maxValue);
				}
			}
			this.syncOptions[option.id] = option.value as never;
		}
	}

	async saveSyncOptions(partialOptions: Partial<StorageValuesSyncOptions>) {
		const syncOptions = Utils.mergeObjs(this.syncOptions, partialOptions);
		await this.doSet({ syncOptions }, true);
		this.updateSyncOptions(partialOptions);
		void EventDispatcher.dispatch('STORAGE_OPTIONS_CHANGE', null, {
			syncOptions: partialOptions,
		});
	}

	updateSyncOptions(options: PartialDeep<StorageValuesSyncOptions>) {
		this.syncOptions = Utils.mergeObjs(this.syncOptions, options);
		this.syncOptionsDetails = Utils.mergeObjs(
			this.syncOptionsDetails,
			Object.fromEntries(Object.entries(this.syncOptions).map(([id, value]) => [id, { value }]))
		);
	}
}

export const BrowserStorage = new _BrowserStorage();
