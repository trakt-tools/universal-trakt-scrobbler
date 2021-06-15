import { Link } from '@material-ui/core';
import * as React from 'react';
import { TraktAuthDetails } from '../api/TraktAuth';
import { SavedItem } from '../models/Item';
import { SavedTraktItem } from '../models/TraktItem';
import { HboGoApiParams } from '../streaming-services/hbo-go/HboGoApi';
import { streamingServices } from '../streaming-services/streaming-services';
import { EventDispatcher } from './Events';
import { I18N } from './I18N';
import { Shared } from './Shared';

export type StorageValues = StorageValuesV2;
export type StorageValuesOptions = StorageValuesOptionsV2;
export type StorageValuesSyncOptions = StorageValuesSyncOptionsV2;

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

export type StorageValuesOptionsV2 = {
	streamingServices: Record<string, StreamingServiceValue>;
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

export type StreamingServiceValue = {
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
	permissions: browser.permissions.Permission[];
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
	currentVersion = 2;
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

		await BrowserStorage.set({ version: this.currentVersion }, true);

		console.log('Upgraded!');
	}

	/**
	 * `objectVX` and `objectVY` are always the same object.
	 * They are only separated by type, to make it easier to understand the downgrade process.
	 */
	async downgrade(version: number) {
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

	onStorageChanged = (
		changes: browser.storage.ChangeDict,
		areaName: browser.storage.StorageName
	) => {
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
			const values = await browser.storage.sync.get();
			for (const key of Object.keys(values)) {
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
			streamingServices: {
				type: 'list',
				id: 'streamingServices',
				name: '',
				description: '',
				value: Object.fromEntries(
					Object.keys(streamingServices).map((serviceId) => [
						serviceId,
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
				description: (
					<>
						{I18N.translate('sendReceiveSuggestionsDescription')}
						<br />
						<Link
							href="https://docs.google.com/spreadsheets/d/1V3m_eMYTJSREehtxz3SeNqFLJlWWIx7Bm0Dp-1WMvnk/edit?usp=sharing"
							target="_blank"
							rel="noreferrer"
						>
							Google Sheet
						</Link>
					</>
				),
				value: false,
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
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
			if (option.id === 'streamingServices') {
				const missingServices = Object.fromEntries(
					Object.keys(streamingServices)
						.filter((serviceId) => !(serviceId in option.value))
						.map((serviceId) => [
							serviceId,
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
			if (BrowserStorage.isStreamingServiceOption(option)) {
				for (const [id, value] of Object.entries(option.value)) {
					if (!this.options.streamingServices) {
						this.options.streamingServices = {};
					}
					this.options.streamingServices[id] = {
						...(this.options.streamingServices?.[id] ?? {}),
						...value,
					};
					this.optionsDetails.streamingServices.value[id] = {
						...this.optionsDetails.streamingServices.value[id],
						...value,
					};
				}
			} else {
				this.options[option.id] = option.value;
				this.optionsDetails[option.id].value = option.value;
			}
		}
	}

	isStreamingServiceOption(
		option: Partial<Option<keyof StorageValuesOptions>>
	): option is Option<'streamingServices'> {
		return option.id === 'streamingServices';
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
