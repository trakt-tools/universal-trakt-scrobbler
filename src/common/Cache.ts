import { Suggestion } from '@apis/CorrectionApi';
import { TmdbApiConfig } from '@apis/TmdbApi';
import { TraktSettingsResponse } from '@apis/TraktSettings';
import { TraktHistoryItem } from '@apis/TraktSync';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { ScrobbleItemValues } from '@models/Item';
import { TraktItemValues } from '@models/TraktItem';
import browser, { Alarms as WebExtAlarms } from 'webextension-polyfill';

export type CacheItems<T extends (keyof CacheValues)[]> = {
	[K in T[number]]: CacheItem<K>;
};

export type CacheValues = {
	[K in keyof CacheSubValues]: Partial<Record<string, Cacheable<CacheSubValues[K]>>>;
};

export interface CacheSubValues {
	history: HistoryCache;
	historyItemsToItems: string;
	imageUrls: string | null;
	items: ScrobbleItemValues;
	itemsToTraktItems: string;
	servicesData: unknown;
	suggestions: Suggestion[] | null;
	tmdbApiConfigs: TmdbApiConfig | null;
	traktHistoryItems: TraktHistoryItem[];
	traktItems: TraktItemValues;
	traktSettings: TraktSettingsResponse;
	urlsToTraktItems: string;
}

export type Cacheable<T = unknown> = {
	value: T;
	timestamp: number;
};

export type CacheStorageValues = {
	[K in `${keyof CacheValues}Cache`]?: CacheValues[CacheStorageKeysToKeys[K]];
};

export type CacheStorageKeysToKeys = ReverseMap<CacheKeysToStorageKeys>;

export type CacheKeysToStorageKeys = {
	[K in keyof CacheValues]: `${K}Cache`;
};

export interface HistoryCache {
	nextPage?: number;
	nextUrl?: string;
	items: unknown[];
}

export class CacheItem<K extends keyof CacheValues> {
	readonly cache: CacheValues[K];

	constructor(cache: CacheValues[K]) {
		this.cache = cache;
	}

	get(subKey: string): CacheSubValues[K] | undefined {
		return this.cache[subKey]?.value as never;
	}

	set(subKey: string, subValue: CacheSubValues[K]) {
		// @ts-expect-error TODO: Type this better
		this.cache[subKey] = {
			value: subValue as never,
			timestamp: Cache.timestamp,
		};
	}
}

class _Cache {
	/**
	 * Time to live for each cached value, in seconds.
	 */
	private ttl: Record<keyof CacheValues, number> = {
		history: 24 * 60 * 60,
		historyItemsToItems: 24 * 60 * 60,
		imageUrls: 24 * 60 * 60,
		items: 24 * 60 * 60,
		itemsToTraktItems: 24 * 60 * 60,
		servicesData: 24 * 60 * 60,
		suggestions: 60 * 60,
		tmdbApiConfigs: 7 * 24 * 60 * 60,
		traktHistoryItems: 45 * 60,
		traktItems: 24 * 60 * 60,
		traktSettings: 24 * 60 * 60,
		urlsToTraktItems: 24 * 60 * 60,
	};

	readonly storageKeys = Object.keys(this.ttl).map(
		(key) => `${key}Cache`
	) as (keyof CacheStorageValues)[];

	timestamp = 0;

	async initFromBackground() {
		const existingAlarm = await browser.alarms.get('check-cache');
		if (existingAlarm) {
			return;
		}

		browser.alarms.create('check-cache', {
			delayInMinutes: 1,
			// Check again every hour
			periodInMinutes: 60,
		});
	}

	addBackgroundListeners() {
		browser.alarms.onAlarm.addListener(this.onAlarm);
	}

	private onAlarm = (alarm: WebExtAlarms.Alarm) => {
		if (alarm.name !== 'check-cache') {
			return;
		}

		void this.check();
	};

	private async check() {
		await Shared.waitForInit();

		const now = Utils.unix();
		for (const [key, ttl] of Object.entries(this.ttl) as [keyof CacheValues, number][]) {
			const storageKey = `${key}Cache` as const;
			const storage = await Shared.storage.get(storageKey);
			const cache = storage[storageKey];
			if (!cache) {
				continue;
			}
			for (const [subKey, subValue] of Object.entries(cache) as [string, Cacheable][]) {
				if (now - subValue.timestamp > ttl) {
					delete cache[subKey];
				}
			}
			await Shared.storage.set({ [storageKey]: cache }, false);
		}
	}

	async get<K extends keyof CacheValues>(key: K): Promise<CacheItem<K>>;
	async get<T extends (keyof CacheValues)[]>(keys: T): Promise<CacheItems<T>>;
	async get<K extends keyof CacheValues, T extends (keyof CacheValues)[]>(
		keyOrKeys: K | T
	): Promise<CacheItem<K> | CacheItems<T>> {
		this.timestamp = Utils.unix();

		const caches = {} as CacheItems<T>;
		const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
		const storageKeys = keys.map((key) => `${key}Cache` as const);
		const storage = await Shared.storage.get(storageKeys);
		for (const key of keys) {
			const storageKey = `${key}Cache` as const;
			caches[key] = new CacheItem(storage[storageKey] || {}) as never;
		}
		return Array.isArray(keyOrKeys) ? caches : caches[keyOrKeys];
	}

	async set<T extends (keyof CacheValues)[]>(items: Partial<CacheItems<T>>) {
		const caches: Partial<CacheStorageValues> = {};
		const keys = Object.keys(items) as (keyof CacheItems<T>)[];
		const storageKeys = keys.map((key) => `${key}Cache` as const);
		const storage = await Shared.storage.get(storageKeys);
		for (const key of keys) {
			const storageKey = `${key}Cache` as const;
			caches[storageKey] = {
				...(storage[storageKey] || {}),
				...(items[key]?.cache || {}),
			} as never;
		}
		await Shared.storage.set(caches, false);
	}
}

export const Cache = new _Cache();
