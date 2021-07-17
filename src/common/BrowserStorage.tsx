import { HboGoApiParams } from '@/hbo-go/HboGoApi';
import { Suggestion } from '@apis/CorrectionApi';
import { TraktAuthDetails } from '@apis/TraktAuth';
import { CacheStorageValues } from '@common/Cache';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { SavedItem } from '@models/Item';
import { getServices } from '@models/Service';
import { SavedTraktItem } from '@models/TraktItem';
import '@services';
import * as React from 'react';
import {
	browser,
	Manifest as WebExtManifest,
	Storage as WebExtStorage,
} from 'webextension-polyfill-ts';

export type StorageValues = StorageValuesV5;
export type StorageValuesOptions = StorageValuesOptionsV3;
export type StorageValuesSyncOptions = StorageValuesSyncOptionsV2;

export type StorageValuesV5 = {
	version?: number;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV3;
	syncOptions?: StorageValuesSyncOptionsV2;
	syncCache?: SyncCacheValue;
	corrections?: Partial<Record<string, Suggestion>>;
	scrobblingItem?: Omit<SavedItem, ''>;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
} & CacheStorageValues;

export type StorageValuesV4 = {
	version?: number;
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
	version?: number;
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
	version?: number;
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
	version?: number;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV1;
	syncOptions?: StorageValuesSyncOptionsV1;
	traktCache?: unknown;
	correctUrls?: Partial<Record<string, Record<string, string>>>;
	scrobblingItem?: unknown;
	scrobblingTabId?: number;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
};

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

class _BrowserStorage {
	currentVersion = 5;
	isSyncAvailable: boolean;
	options = {} as StorageValuesOptions;
	optionsDetails = {} as Options;
	syncOptions = {} as StorageValuesSyncOptions;
	syncOptionsDetails = {} as SyncOptions;

	constructor() {
		this.isSyncAvailable = !!browser.storage.sync;
	}

	async init() {
		await this.sync();
		await this.upgradeOrDowngrade();
		await this.loadOptions();
		await this.loadSyncOptions();
		this.startListeners();
	}

	async upgradeOrDowngrade() {
		const { version = 1 } = await BrowserStorage.get('version');

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
		if (version < 2) {
			console.log('Upgrading to v2...');

			await BrowserStorage.remove(
				['traktCache', 'correctUrls', 'scrobblingItem'] as unknown as (keyof StorageValues)[],
				true
			);

			const values = await BrowserStorage.get('options');

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

				await BrowserStorage.set({ options: optionsV2 as unknown as StorageValuesOptions }, true);
			}
		}

		if (version < 3) {
			console.log('Upgrading to v3...');

			const values = await BrowserStorage.get('options');

			const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
			const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
			if (optionsV2 && optionsV3) {
				optionsV3.services = optionsV2.streamingServices;

				delete optionsV2.streamingServices;

				await BrowserStorage.set({ options: optionsV3 as unknown as StorageValuesOptions }, true);
			}
		}

		if (version < 4) {
			console.log('Upgrading to v4...');

			await BrowserStorage.remove(['correctItems'] as unknown as (keyof StorageValues)[], true);
		}

		if (version < 5) {
			console.log('Upgrading to v5...');

			await BrowserStorage.remove(['traktCache'] as unknown as (keyof StorageValues)[], true);
		}

		await BrowserStorage.set({ version: this.currentVersion }, true);

		console.log('Upgraded!');
	}

	/**
	 * `objectVX` and `objectVY` are always the same object.
	 * They are only separated by type, to make it easier to understand the downgrade process.
	 */
	async downgrade(version: number) {
		if (version > 4) {
			console.log('Downgrading to v4...');

			await BrowserStorage.remove(
				[
					'imageUrlsCache',
					'suggestionsCache',
					'tmdbApiConfigsCache',
					'traktCache',
				] as unknown as (keyof StorageValues)[],
				true
			);
		}

		if (version > 3) {
			console.log('Downgrading to v3...');

			await BrowserStorage.remove(['corrections'] as unknown as (keyof StorageValues)[], true);
		}

		if (version > 2) {
			console.log('Downgrading to v2...');

			const values = await BrowserStorage.get('options');

			const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
			const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
			if (optionsV2 && optionsV3) {
				optionsV2.streamingServices = optionsV3.services;

				delete optionsV3.services;

				await BrowserStorage.set({ options: optionsV2 as unknown as StorageValuesOptions }, true);
			}
		}

		if (version > 1) {
			console.log('Downgrading to v1...');

			await BrowserStorage.remove(
				[
					'traktCache',
					'syncCache',
					'correctItems',
					'scrobblingItem',
				] as unknown as (keyof StorageValues)[],
				true
			);

			const values = await BrowserStorage.get(['options', 'syncOptions']);

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

				await BrowserStorage.set({ options: optionsV1 as unknown as StorageValuesOptions }, true);
			}

			const syncOptionsV1 = values.syncOptions as Partial<StorageValuesSyncOptionsV1> | undefined;
			const syncOptionsV2 = values.syncOptions as Partial<StorageValuesSyncOptionsV2> | undefined;
			if (syncOptionsV1 && syncOptionsV2) {
				delete syncOptionsV2.addWithReleaseDateMissing;
				delete syncOptionsV2.minPercentageWatched;

				await BrowserStorage.set(
					{ syncOptions: syncOptionsV1 as unknown as StorageValuesSyncOptions },
					true
				);
			}
		}

		await BrowserStorage.set({ version: this.currentVersion }, true);

		console.log('Downgraded!');
	}

	startListeners() {
		browser.storage.onChanged.addListener(this.onStorageChanged);
	}

	stopListeners() {
		browser.storage.onChanged.removeListener(this.onStorageChanged);
	}

	onStorageChanged = (changes: Record<string, WebExtStorage.StorageChange>, areaName: string) => {
		if (areaName !== 'local') {
			return;
		}

		const newOptions = changes.options?.newValue as StorageValuesOptions | undefined;
		if (newOptions) {
			for (const [id, value] of Object.entries(newOptions) as [
				keyof StorageValuesOptions,
				StorageValuesOptions[keyof StorageValuesOptions]
			][]) {
				this.addOption({ id, value });
			}
			void EventDispatcher.dispatch('STORAGE_OPTIONS_CHANGE', null, {});
		}
		const newSyncOptions = changes.syncOptions?.newValue as StorageValuesSyncOptions | undefined;
		if (newSyncOptions) {
			for (const [id, value] of Object.entries(newSyncOptions) as [
				keyof StorageValuesSyncOptions,
				StorageValuesSyncOptions[keyof StorageValuesSyncOptions]
			][]) {
				this.addSyncOption({ id, value });
			}
		}
	};

	async sync(): Promise<void> {
		if (this.isSyncAvailable) {
			const values = (await browser.storage.sync.get()) as StorageValues;
			for (const key of Object.keys(values) as (keyof StorageValues)[]) {
				await browser.storage.local.set({ [key]: values[key] });
			}
		}
	}

	async set(values: StorageValues, doSync: boolean): Promise<void> {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.set(values);
		}
		await browser.storage.local.set(values);
	}

	get(keys?: keyof StorageValues | (keyof StorageValues)[] | null): Promise<StorageValues> {
		return browser.storage.local.get(keys);
	}

	async remove(keys: keyof StorageValues | (keyof StorageValues)[], doSync = false): Promise<void> {
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
		const values = await BrowserStorage.get('options');
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
				option.value = { ...option.value, ...missingServices };
			}
			this.addOption(option);
		}
	}

	async saveOptions(options: Partial<StorageValuesOptions>) {
		for (const [id, value] of Object.entries(options) as [
			keyof StorageValuesOptions,
			StorageValuesOptions[keyof StorageValuesOptions]
		][]) {
			this.addOption({ id, value });
		}
		await BrowserStorage.set({ options: this.options }, true);
	}

	addOption<K extends keyof StorageValuesOptions>(option: Partial<Option<K>>) {
		if (typeof option.id !== 'undefined' && typeof option.value !== 'undefined') {
			if (BrowserStorage.isServiceOption(option)) {
				for (const [id, value] of Object.entries(option.value)) {
					if (!this.options.services) {
						this.options.services = {};
					}
					this.options.services[id] = {
						...(this.options.services?.[id] ?? {}),
						...value,
					};
					this.optionsDetails.services.value[id] = {
						...this.optionsDetails.services.value[id],
						...value,
					};
				}
			} else {
				this.options[option.id] = option.value;
				this.optionsDetails[option.id].value = option.value;
			}
		}
	}

	isServiceOption(
		option: Partial<Option<keyof StorageValuesOptions>>
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
		const values = await BrowserStorage.get('syncOptions');
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
			this.addSyncOption(option);
		}
	}

	async saveSyncOptions(options: Partial<StorageValuesSyncOptions>) {
		for (const [id, value] of Object.entries(options) as [
			keyof StorageValuesSyncOptions,
			StorageValuesSyncOptions[keyof StorageValuesSyncOptions]
		][]) {
			this.addSyncOption({ id, value });
		}
		await BrowserStorage.set({ syncOptions: this.syncOptions }, true);
	}

	addSyncOption<K extends keyof StorageValuesSyncOptions>(option: Partial<SyncOption<K>>) {
		if (typeof option.id !== 'undefined' && typeof option.value !== 'undefined') {
			this.syncOptions[option.id] = option.value;
			this.syncOptionsDetails[option.id].value = option.value;
		}
	}
}

export const BrowserStorage = new _BrowserStorage();
