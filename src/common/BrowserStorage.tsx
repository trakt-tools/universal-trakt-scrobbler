import { Link } from '@material-ui/core';
import * as React from 'react';
import { TraktAuthDetails } from '../api/TraktAuth';
import { CorrectionSuggestion, ItemBase } from '../models/Item';
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
	correctItems?: Partial<Record<StreamingServiceId, Record<string, CorrectItem>>>;
	scrobblingItem?: ScrobblingItem;
	scrobblingTabId?: number;
	hboGoApiParams?: Omit<HboGoApiParams, ''>;
};

export type StorageValuesOptions = {
	streamingServices: Record<StreamingServiceId, boolean>;
	disableScrobbling: boolean;
	showNotifications: boolean;
	sendReceiveSuggestions: boolean;
	theme: ThemeValue;
	allowRollbar: boolean;
	grantCookies: boolean;
};

export type ThemeValue = 'light' | 'dark' | 'system';

export type StorageValuesSyncOptions = {
	addWithReleaseDate: boolean;
	hideSynced: boolean;
	itemsPerLoad: number;
	minPercentageWatched: number;
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
	[K in keyof StorageValuesSyncOptions]: {
		id: K;
		name: string;
		value: StorageValuesSyncOptions[K];
		minValue?: number;
		maxValue?: number;
	};
};

export type SyncOption = SyncOptions[keyof SyncOptions];

class _BrowserStorage {
	isSyncAvailable: boolean;

	constructor() {
		this.isSyncAvailable = !!browser.storage.sync;
	}

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

	getOptions = async (): Promise<Options> => {
		const options: Options = {
			streamingServices: {
				type: 'list',
				id: 'streamingServices',
				name: '',
				description: '',
				value: Object.fromEntries(
					Object.keys(streamingServices).map((serviceId) => [serviceId, false])
				) as Record<StreamingServiceId, boolean>,
				origins: [],
				permissions: [],
				doShow: true,
			},
			disableScrobbling: {
				type: 'switch',
				id: 'disableScrobbling',
				name: '',
				description: '',
				value: false,
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
		for (const option of Object.values(options)) {
			option.name = I18N.translate(`${option.id}Name` as MessageName);
			if (!option.description) {
				option.description = I18N.translate(`${option.id}Description` as MessageName);
			}
			option.value = (values.options && values.options[option.id]) || option.value;
			if (option.id === 'streamingServices') {
				const missingServices = Object.fromEntries(
					Object.keys(streamingServices)
						.filter((serviceId) => !(serviceId in option.value))
						.map((serviceId) => [serviceId, false])
				) as Record<StreamingServiceId, boolean>;
				option.value = { ...option.value, ...missingServices };
			}
		}
		return options;
	};

	getSyncOptions = async (): Promise<SyncOptions> => {
		const options: SyncOptions = {
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
		for (const option of Object.values(options)) {
			option.name = I18N.translate(`${option.id}Name` as MessageName);
			option.value = (values.syncOptions && values.syncOptions[option.id]) || option.value;
			if (typeof option.value === 'number') {
				if (typeof option.minValue !== 'undefined') {
					option.value = Math.max(option.value, option.minValue);
				}
				if (typeof option.maxValue !== 'undefined') {
					option.value = Math.min(option.value, option.maxValue);
				}
			}
		}
		return options;
	};
}

export const BrowserStorage = new _BrowserStorage();
