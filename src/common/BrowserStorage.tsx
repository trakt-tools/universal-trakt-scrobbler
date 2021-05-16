import { Link } from '@material-ui/core';
import * as React from 'react';
import { TraktAuthDetails } from '../api/TraktAuth';
import { CorrectionSuggestion, ItemBase, SavedItem } from '../models/Item';
import { TraktItemBase } from '../models/TraktItem';
import { HboGoApiParams } from '../streaming-services/hbo-go/HboGoApi';
import { StreamingServiceId, streamingServices } from '../streaming-services/streaming-services';
import { I18N } from './I18N';
import { Shared } from './Shared';

export type StorageValues = {
	auth?: TraktAuthDetails;
	options?: StorageValuesOptions;
	syncOptions?: StorageValuesSyncOptions;
	traktCache?: Record<string, Omit<TraktItemBase, ''>>;
	syncCache?: SyncCacheValue;
	correctItems?: Partial<Record<StreamingServiceId, Record<string, CorrectItem>>>;
	scrobblingItem?: ScrobblingItem;
	scrobblingTabId?: number;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
};

export type StorageValuesOptions = {
	streamingServices: Record<StreamingServiceId, StreamingServiceValue>;
	showNotifications: boolean;
	sendReceiveSuggestions: boolean;
	theme: ThemeValue;
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

export type StorageValuesSyncOptions = {
	addWithReleaseDate: boolean;
	hideSynced: boolean;
	itemsPerLoad: number;
	minPercentageWatched: number;
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

export type ScrobblingItem = Omit<ItemBase, ''> & {
	trakt: Omit<TraktItemBase, ''>;
	correctionSuggestions?: Omit<CorrectionSuggestion, ''>[] | null;
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
};

class _BrowserStorage {
	isSyncAvailable: boolean;
	options = {} as StorageValuesOptions;
	optionsDetails = {} as Options;
	syncOptions = {} as StorageValuesSyncOptions;
	syncOptionsDetails = {} as SyncOptions;

	constructor() {
		this.isSyncAvailable = !!browser.storage.sync;
	}

	init = async () => {
		await this.sync();
		await this.loadOptions();
		await this.loadSyncOptions();
		this.startListeners();
	};

	startListeners = () => {
		browser.storage.onChanged.addListener(this.onStorageChanged);
	};

	stopListeners = () => {
		browser.storage.onChanged.removeListener(this.onStorageChanged);
	};

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

	sync = async (): Promise<void> => {
		if (this.isSyncAvailable) {
			const values = await browser.storage.sync.get();
			for (const key of Object.keys(values)) {
				await browser.storage.local.set({ [key]: values[key] });
			}
		}
	};

	set = async (values: StorageValues, doSync: boolean): Promise<void> => {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.set(values);
		}
		await browser.storage.local.set(values);
	};

	get = (keys?: keyof StorageValues | (keyof StorageValues)[] | null): Promise<StorageValues> => {
		return browser.storage.local.get(keys);
	};

	remove = async (
		keys: keyof StorageValues | (keyof StorageValues)[],
		doSync = false
	): Promise<void> => {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.remove(keys);
		}
		await browser.storage.local.remove(keys);
	};

	clear = async (doSync: boolean): Promise<void> => {
		if (doSync && this.isSyncAvailable) {
			await browser.storage.sync.clear();
		}
		await browser.storage.local.clear();
		await this.loadOptions();
		await this.loadSyncOptions();
	};

	getSize = async (
		keys?: keyof StorageValues | (keyof StorageValues)[] | null
	): Promise<string> => {
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
	};

	loadOptions = async (): Promise<void> => {
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
				) as Record<StreamingServiceId, StreamingServiceValue>,
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
					(Object.keys(streamingServices) as StreamingServiceId[])
						.filter(
							(serviceId) =>
								!(serviceId in option.value) || typeof option.value[serviceId] === 'boolean'
						)
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
				) as Record<StreamingServiceId, StreamingServiceValue>;
				option.value = { ...option.value, ...missingServices };
			}
			this.addOption(option);
		}
	};

	saveOptions = async (options: Partial<StorageValuesOptions>) => {
		for (const [id, value] of Object.entries(options) as [
			keyof StorageValuesOptions,
			StorageValuesOptions[keyof StorageValuesOptions]
		][]) {
			this.addOption({ id, value });
		}
		await BrowserStorage.set({ options: this.options }, true);
	};

	addOption = <K extends keyof StorageValuesOptions>(option: Partial<Option<K>>) => {
		if (typeof option.id !== 'undefined' && typeof option.value !== 'undefined') {
			if (BrowserStorage.isStreamingServiceOption(option)) {
				for (const [id, value] of Object.entries(option.value) as [
					StreamingServiceId,
					StreamingServiceValue
				][]) {
					this.options[option.id][id] = {
						...this.options[option.id][id],
						...value,
					};
					this.optionsDetails[option.id].value[id] = {
						...this.optionsDetails[option.id].value[id],
						...value,
					};
				}
			} else {
				this.options[option.id] = option.value;
				this.optionsDetails[option.id].value = option.value;
			}
		}
	};

	isStreamingServiceOption = (
		option: Partial<Option<keyof StorageValuesOptions>>
	): option is Option<'streamingServices'> => {
		return option.id === 'streamingServices';
	};

	loadSyncOptions = async (): Promise<void> => {
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
	};

	saveSyncOptions = async (options: Partial<StorageValuesSyncOptions>) => {
		for (const [id, value] of Object.entries(options) as [
			keyof StorageValuesSyncOptions,
			StorageValuesSyncOptions[keyof StorageValuesSyncOptions]
		][]) {
			this.addSyncOption({ id, value });
		}
		await BrowserStorage.set({ syncOptions: this.syncOptions }, true);
	};

	addSyncOption = <K extends keyof StorageValuesSyncOptions>(option: Partial<SyncOption<K>>) => {
		if (typeof option.id !== 'undefined' && typeof option.value !== 'undefined') {
			this.syncOptions[option.id] = option.value;
			this.syncOptionsDetails[option.id].value = option.value;
		}
	};
}

export const BrowserStorage = new _BrowserStorage();
