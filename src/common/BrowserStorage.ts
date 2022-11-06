import { Suggestion } from '@apis/CorrectionApi';
import { TraktAuthDetails } from '@apis/TraktAuth';
import { TraktSettings } from '@apis/TraktSettings';
import { CacheStorageValues } from '@common/Cache';
import { I18N } from '@common/I18N';
import { Messaging } from '@common/Messaging';
import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { ScrobbleItemValues } from '@models/Item';
import { getService, getServices } from '@models/Service';
import { TraktItemValues } from '@models/TraktItem';
import '@services';
import { PartialDeep } from 'type-fest';
import browser, { Manifest as WebExtManifest } from 'webextension-polyfill';

export type StorageValues = StorageValuesV11;
export type StorageValuesOptions = StorageValuesOptionsV4;
export type StorageValuesSyncOptions = StorageValuesSyncOptionsV3;

export type StorageValuesV11 = Omit<StorageValuesV10, 'version'> & {
	version?: 11;
};

export type StorageValuesV10 = Omit<StorageValuesV8, 'version' | 'options'> & {
	version?: 10;
	options?: StorageValuesOptionsV4;
};

export type StorageValuesV9 = Omit<StorageValuesV8, 'version'> & {
	version?: 9;
};

export type StorageValuesV8 = Omit<StorageValuesV7, 'version'> & {
	version?: 8;
};

export type StorageValuesV7 = Omit<StorageValuesV6, 'version' | 'hboGoApiParams'> & {
	version?: 7;
};

export type StorageValuesV6 = Omit<
	StorageValuesV5,
	'version' | 'syncOptions' | 'scrobblingItem'
> & {
	version?: 6;
	syncOptions?: StorageValuesSyncOptionsV3;
	scrobblingDetails?: ScrobblingDetails;
} & CacheStorageValues;

export type StorageValuesV5 = Omit<StorageValuesV4, 'version' | 'traktCache'> & {
	version?: 5;
} & CacheStorageValues;

export type StorageValuesV4 = Omit<StorageValuesV3, 'version' | 'correctItems'> & {
	version?: 4;
	corrections?: Partial<Record<string, Suggestion>>;
};

export type StorageValuesV3 = Omit<StorageValuesV2, 'version' | 'options'> & {
	version?: 3;
	options?: StorageValuesOptionsV3;
};

export type StorageValuesV2 = Omit<
	StorageValuesV1,
	'version' | 'options' | 'syncOptions' | 'traktCache' | 'correctUrls' | 'scrobblingItem'
> & {
	version?: 2;
	options?: StorageValuesOptionsV2;
	syncOptions?: StorageValuesSyncOptionsV2;
	traktCache?: Record<string, TraktItemValues>;
	syncCache?: SyncCacheValue;
	correctItems?: Partial<Record<string, Record<string, CorrectItem>>>;
	scrobblingItem?: ScrobbleItemValues;
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
	hboGoApiParams?: unknown;
};

export interface ScrobblingDetails {
	item: ScrobbleItemValues;
	tabId: number | null;
	isPaused: boolean;
}

export type StorageValuesOptionsV4 = StorageValuesOptionsV3 & {
	loadImages: boolean;
};

export type StorageValuesOptionsV3 = Omit<StorageValuesOptionsV2, 'streamingServices'> & {
	services: Record<string, ServiceValue>;
};

export type StorageValuesOptionsV2 = Omit<
	StorageValuesOptionsV1,
	'streamingServices' | 'disableScrobbling'
> & {
	streamingServices: Record<string, ServiceValue>;
	theme: ThemeValue;
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

export type StorageValuesSyncOptionsV3 = Omit<StorageValuesSyncOptionsV2, 'itemsPerLoad'>;

export type StorageValuesSyncOptionsV2 = StorageValuesSyncOptionsV1 & {
	addWithReleaseDateMissing: boolean;
	minPercentageWatched: number;
};

export type StorageValuesSyncOptionsV1 = {
	addWithReleaseDate: boolean;
	hideSynced: boolean;
	itemsPerLoad: number;
};

export type SyncCacheValue = {
	items: ScrobbleItemValues[];
	failed: boolean;
};

export type CorrectItem = {
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
};

export type OptionsDetails = {
	[K in keyof StorageValuesOptions]: OptionDetails<StorageValuesOptions, K>;
};

export type SyncOptionsDetails = {
	[K in keyof StorageValuesSyncOptions]: OptionDetails<StorageValuesSyncOptions, K>;
};

export type OptionDetails<T, K extends keyof T = keyof T> =
	| SelectOptionDetails<T, K>
	| SwitchOptionDetails<T, K>
	| TextFieldOptionDetails<T, K>
	| NumericTextFieldOptionDetails<T, K>
	| CustomOptionDetails<T, K>;

export type OptionDetailsByType<
	T,
	U extends OptionDetails<T, K>['type'],
	K extends keyof T = keyof T
> = U extends 'select'
	? SelectOptionDetails<T, K>
	: U extends 'switch'
	? SwitchOptionDetails<T, K>
	: U extends 'text'
	? TextFieldOptionDetails<T, K>
	: U extends 'number'
	? NumericTextFieldOptionDetails<T, K>
	: U extends 'custom'
	? CustomOptionDetails<T, K>
	: OptionDetails<T, K>;

export type BaseOptionDetails<T, K extends keyof T> = {
	id: K;
	value: T[K];
	origins?: string[];
	permissions?: WebExtManifest.OptionalPermission[];
	dependencies?: (keyof T)[];
	doShow: boolean;
};

export interface SelectOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'select';
	value: string;
	choices: Record<string, string>;
}

export interface SwitchOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'switch';
	value: boolean;
}

export interface TextFieldOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'text';
	value: string;
}

export interface NumericTextFieldOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'number';
	value: number;
	isFloat?: number;
	minValue?: number;
	maxValue?: number;
	step?: number;
}

export interface CustomOptionDetails<T, K extends keyof T> extends BaseOptionDetails<T, K> {
	type: 'custom';
}

export type BrowserStorageSetValues = Omit<StorageValues, 'options' | 'syncOptions'>;

export type BrowserStorageRemoveKey = Exclude<keyof StorageValues, 'options' | 'syncOptions'>;

class _BrowserStorage {
	readonly currentVersion = 11;

	isSyncAvailable: boolean;
	options = {} as StorageValuesOptions;
	optionsDetails = {} as OptionsDetails;
	syncOptions = {} as StorageValuesSyncOptions;
	syncOptionsDetails = {} as SyncOptionsDetails;

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
		await Session.checkLogin();
		if (Session.isLoggedIn) {
			Shared.dateFormat = await TraktSettings.getTimeAndDateFormat();
		}
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

			const values = await this.get('syncOptions');

			const optionsV2 = values.syncOptions as Partial<StorageValuesSyncOptionsV2> | undefined;
			const optionsV3 = values.syncOptions as Partial<StorageValuesSyncOptionsV3> | undefined;
			if (optionsV2 && optionsV3) {
				delete optionsV2.itemsPerLoad;

				await this.doSet({ syncOptions: optionsV3 as unknown as StorageValuesSyncOptions }, true);
			}
		}

		if (version < 7 && this.currentVersion >= 7) {
			console.log('Upgrading to v7...');

			const { options } = await this.get('options');

			if (options?.services && 'hbo-go' in options.services) {
				options.services['hbo-max'] = options.services['hbo-go'];
				options.services['hbo-max'].lastSync = 0;
				options.services['hbo-max'].lastSyncId = '';
				delete options.services['hbo-go'];

				await this.doSet({ options }, true);
			}
		}

		if (version < 8 && this.currentVersion >= 8) {
			console.log('Upgrading to v8...');

			const { options } = await this.get('options');

			if (options?.services && 'telia-play' in options.services) {
				delete options.services['telia-play'];

				await this.doSet({ options }, true);
			}
		}

		if (version < 9 && this.currentVersion >= 9) {
			console.log('Upgrading to v9...');

			await this.doRemove(['itemsCache', 'syncCache', 'traktItemsCache'], true);
		}

		if (version < 10 && this.currentVersion >= 10) {
			console.log('Upgrading to v10...');
		}

		if (version < 11 && this.currentVersion >= 11) {
			console.log('Upgrading to v11...');

			const { options } = await this.get('options');

			if (options?.services && 'crunchyroll-beta' in options.services) {
				options.services['crunchyroll'] = options.services['crunchyroll-beta'];
				options.services['crunchyroll'].lastSync = 0;
				options.services['crunchyroll'].lastSyncId = '';
				delete options.services['crunchyroll-beta'];

				await this.doSet({ options }, true);
			}
		}

		await this.set({ version: this.currentVersion }, true);

		console.log('Upgraded!');
	}

	/**
	 * `objectVX` and `objectVY` are always the same object.
	 * They are only separated by type, to make it easier to understand the downgrade process.
	 */
	async downgrade(version: number) {
		if (version > 10 && this.currentVersion <= 10) {
			console.log('Downgrading to v10...');
			const values = await this.get('options');
			const options = values.options;
			if (options) {
				delete options.services['crunchyroll'];
				await this.doSet({ options: options as unknown as StorageValuesOptions }, true);
			}
		}

		if (version > 9 && this.currentVersion <= 9) {
			console.log('Downgrading to v9...');

			const values = await this.get('options');

			const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
			const optionsV4 = values.options as Partial<StorageValuesOptionsV4> | undefined;
			if (optionsV3 && optionsV4) {
				delete optionsV4.loadImages;

				await this.doSet({ options: optionsV3 as unknown as StorageValuesOptions }, true);
			}
		}

		if (version > 8 && this.currentVersion <= 8) {
			console.log('Downgrading to v8...');

			await this.doRemove(['itemsCache', 'syncCache', 'traktItemsCache'], true);
		}

		if (version > 7 && this.currentVersion <= 7) {
			console.log('Downgrading to v7...');
		}

		if (version > 6 && this.currentVersion <= 6) {
			console.log('Downgrading to v6...');
		}

		if (version > 5 && this.currentVersion <= 5) {
			console.log('Downgrading to v5...');

			await this.doRemove(['scrobblingDetails'] as unknown as (keyof StorageValues)[], true);
		}

		if (version > 4 && this.currentVersion <= 4) {
			console.log('Downgrading to v4...');

			await this.doRemove(
				[
					'historyCache',
					'historyItemsToItemsCache',
					'imageUrlsCache',
					'itemsCache',
					'itemsToTraktItemsCache',
					'servicesDataCache',
					'suggestionsCache',
					'tmdbApiConfigsCache',
					'traktHistoryItemsCache',
					'traktItemsCache',
					'traktSettingsCache',
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
			let values = (await browser.storage.sync.get()) as StorageValues;
			values = this.joinChunks(values);
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
			values = await this.splitChunks(values);
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
			const syncKeys = [];
			for (const key of keys) {
				syncKeys.push(key);

				const numChunks = await this.getNumChunks(key);
				if (numChunks > 0) {
					syncKeys.push(...this.getChunkKeys(key, numChunks));
				}
			}
			await browser.storage.sync.remove(syncKeys);
		}
		await browser.storage.local.remove(keys);
	}

	async clear(doSync: boolean): Promise<void> {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.clear();
		}
		await browser.storage.local.clear();
		await this.set({ version: this.currentVersion }, true);
		await this.reset();
		void Shared.events.dispatch('STORAGE_OPTIONS_CHANGE', null, {
			options: this.options,
			syncOptions: this.syncOptions,
		});
		void Shared.events.dispatch('STORAGE_OPTIONS_CLEAR', null, {});
	}

	async reset() {
		this.options = {} as StorageValuesOptions;
		this.syncOptions = {} as StorageValuesSyncOptions;
		await this.loadOptions();
		await this.loadSyncOptions();
	}

	/**
	 * Splits values in chunks, so that each chunk is smaller than QUOTA_BYTES_PER_ITEM
	 * and therefore can be saved in the sync storage.
	 */
	private async splitChunks(values: Record<string, unknown>): Promise<StorageValues> {
		const maxSize = browser.storage.sync.QUOTA_BYTES_PER_ITEM ?? 8192;
		const newValues: Record<string, unknown> = {};
		const keysToRemove: string[] = [];

		for (const [key, value] of Object.entries(values)) {
			let stringifiedValue = JSON.stringify(value);
			const size = `${key}${stringifiedValue}`.length + 10;
			const numChunks = await this.getNumChunks(key);

			if (size < maxSize && numChunks === 0) {
				newValues[key] = value;
				continue;
			}

			keysToRemove.push(key);

			const chunks = [];
			const sliceEnd = maxSize - key.length - 10;

			while (stringifiedValue.length > 0) {
				chunks.push(stringifiedValue.slice(0, sliceEnd));
				stringifiedValue = stringifiedValue.slice(sliceEnd);
			}

			if (chunks.length > 1) {
				for (const [i, chunk] of chunks.entries()) {
					const chunkKey = this.getChunkKey(key, i);
					newValues[chunkKey] = chunk;
				}

				const chunksKey = this.getChunksKey(key);
				newValues[chunksKey] = chunks.length;
			} else {
				newValues[key] = JSON.parse(chunks[0]);
			}
		}

		if (keysToRemove.length > 0) {
			await this.remove(keysToRemove as BrowserStorageRemoveKey[], true);
		}

		return newValues;
	}

	private joinChunks(values: Record<string, unknown>): StorageValues {
		const newValues: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(values)) {
			if (!key.includes('_chunk')) {
				newValues[key] = value;
				continue;
			}

			if (!key.endsWith('_chunks')) {
				continue;
			}

			const numChunks = value as number;
			const actualKey = key.split('_chunks')[0];
			let stringifiedValue = '';

			for (let i = 0; i < numChunks; i++) {
				const chunkKey = this.getChunkKey(actualKey, i);
				stringifiedValue += values[chunkKey];
			}

			newValues[actualKey] = JSON.parse(stringifiedValue);
		}

		return newValues;
	}

	private async getNumChunks(key: string): Promise<number> {
		const chunksKey = this.getChunksKey(key);
		const values = await browser.storage.local.get(chunksKey);
		return (values[chunksKey] as number) || 0;
	}

	private getChunksKey(key: string): string {
		return `${key}_chunks`;
	}

	private getChunkKeys(key: string, numChunks: number): string[] {
		return [
			this.getChunksKey(key),
			...new Array(numChunks).fill('').map((_, i) => this.getChunkKey(key, i)),
		];
	}

	private getChunkKey(key: string, i: number): string {
		return `${key}_chunk${i.toString().padStart(3, '0')}`;
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
				type: 'custom',
				id: 'services',
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
				doShow: true,
			},
			showNotifications: {
				type: 'switch',
				id: 'showNotifications',
				value: false,
				permissions: ['notifications'],
				doShow: true,
			},
			sendReceiveSuggestions: {
				type: 'switch',
				id: 'sendReceiveSuggestions',
				value: false,
				doShow: true,
			},
			loadImages: {
				type: 'switch',
				id: 'loadImages',
				value: true,
				doShow: true,
			},
			theme: {
				type: 'select',
				id: 'theme',
				value: 'system',
				choices: {
					light: I18N.translate('lightTheme'),
					dark: I18N.translate('darkTheme'),
					system: I18N.translate('systemTheme'),
				},
				doShow: true,
			},
			allowRollbar: {
				type: 'switch',
				id: 'allowRollbar',
				value: false,
				origins: ['*://api.rollbar.com/*'],
				doShow: true,
			},
			grantCookies: {
				type: 'switch',
				id: 'grantCookies',
				value: false,
				permissions: ['cookies', 'webRequest', 'webRequestBlocking'],
				doShow: Shared.browser === 'firefox',
			},
		};
		const values = await this.get('options');
		if (values.options) {
			this.options = values.options;
		}
		for (const option of Object.values(this.optionsDetails)) {
			option.value =
				typeof this.options[option.id] !== 'undefined' ? this.options[option.id] : option.value;
			if (this.isOption(option, 'services', 'custom')) {
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

			for (const [id, partialValue] of Object.entries(partialOptions.services)) {
				if (!partialValue || (!('scrobble' in partialValue) && !('sync' in partialValue))) {
					continue;
				}

				const value = options.services[id];
				const service = getService(id);
				if (partialValue.scrobble || partialValue.sync) {
					originsToAdd.push(...service.hostPatterns);
				} else if (!value.scrobble && !value.sync) {
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
				void Shared.events.dispatch('STORAGE_OPTIONS_CHANGE', null, {
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

	isOption<T, U extends OptionDetails<T, K>['type'], K extends keyof T>(
		option: OptionDetails<T>,
		id: K | null,
		type: U | null = null
	): option is OptionDetailsByType<T, U, K> {
		return (!id || option.id === id) && (!type || option.type === type);
	}

	async loadSyncOptions(): Promise<void> {
		this.syncOptionsDetails = {
			hideSynced: {
				type: 'switch',
				id: 'hideSynced',
				value: false,
				doShow: true,
			},
			addWithReleaseDate: {
				type: 'switch',
				id: 'addWithReleaseDate',
				value: false,
				doShow: true,
			},
			addWithReleaseDateMissing: {
				type: 'switch',
				id: 'addWithReleaseDateMissing',
				value: false,
				dependencies: ['addWithReleaseDate'],
				doShow: true,
			},
			minPercentageWatched: {
				type: 'number',
				id: 'minPercentageWatched',
				value: 75,
				minValue: 0,
				maxValue: 100,
				doShow: true,
			},
		};
		const values = await this.get('syncOptions');
		if (values.syncOptions) {
			this.syncOptions = values.syncOptions;
		}
		for (const option of Object.values(this.syncOptionsDetails)) {
			option.value =
				typeof this.syncOptions[option.id] !== 'undefined'
					? this.syncOptions[option.id]
					: option.value;
			if (this.isOption(option, null, 'number')) {
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
		void Shared.events.dispatch('STORAGE_OPTIONS_CHANGE', null, {
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

	checkDisabledOption(option: OptionDetails<StorageValuesOptions>) {
		const isDisabled =
			option.dependencies?.some((dependency) => !this.options[dependency]) ?? false;
		return isDisabled;
	}

	checkSyncOptionDisabled(option: OptionDetails<StorageValuesSyncOptions>) {
		const isDisabled =
			option.dependencies?.some((dependency) => !this.syncOptions[dependency]) ?? false;
		return isDisabled;
	}
}

export const BrowserStorage = new _BrowserStorage();

Shared.storage = BrowserStorage;
