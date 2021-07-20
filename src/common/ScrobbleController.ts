import { ServiceApi } from '@apis/ServiceApi';
import { TraktScrobble } from '@apis/TraktScrobble';
import { TraktSearch } from '@apis/TraktSearch';
import { BrowserStorage } from '@common/BrowserStorage';
import { Cache } from '@common/Cache';
import { EventDispatcher, ItemCorrectedData, StorageOptionsChangeData } from '@common/Events';
import { getScrobbleParser, ScrobbleParser } from '@common/ScrobbleParser';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';

const scrobbleControllers = new Map<string, ScrobbleController>();

export const getScrobbleController = (id: string) => {
	if (!scrobbleControllers.has(id)) {
		const scrobbleParser = getScrobbleParser(id);
		scrobbleControllers.set(id, new ScrobbleController(scrobbleParser));
	}
	const controller = scrobbleControllers.get(id);
	if (!controller) {
		throw new Error(`Scrobble controller not registered for ${id}`);
	}
	return controller;
};

export class ScrobbleController {
	readonly api: ServiceApi;
	readonly parser: ScrobbleParser;
	private hasSearchedItem = false;
	private reachedScrobbleThreshold = false;
	private scrobbleThreshold = 80.0;
	private progress = 0.0;
	private hasAddedListeners = false;

	constructor(parser: ScrobbleParser) {
		this.parser = parser;
		this.api = this.parser.api;
	}

	init() {
		this.checkListeners();
		EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
	}

	onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		const serviceOption = data.options?.services?.[this.api.id];
		if (serviceOption && 'scrobble' in serviceOption) {
			this.checkListeners();
		}
	};

	checkListeners() {
		const { scrobble } = BrowserStorage.options?.services?.[this.api.id];
		if (scrobble && !this.hasAddedListeners) {
			EventDispatcher.subscribe('ITEM_CORRECTED', null, this.onItemCorrected);
			this.hasAddedListeners = true;
		} else if (!scrobble && this.hasAddedListeners) {
			EventDispatcher.unsubscribe('ITEM_CORRECTED', null, this.onItemCorrected);
			this.hasAddedListeners = false;
		}
	}

	async startScrobble(): Promise<void> {
		const item = this.parser.getItem();
		if (!item) {
			return;
		}
		this.reachedScrobbleThreshold = false;
		this.progress = 0.0;
		if (!item.trakt && !this.hasSearchedItem) {
			this.hasSearchedItem = true;
			const caches = await Cache.get(['itemsToTraktItems', 'traktItems', 'urlsToTraktItems']);
			const { corrections } = await BrowserStorage.get(['corrections']);
			const databaseId = item.getDatabaseId();
			const correction = corrections?.[databaseId];
			item.trakt = await TraktSearch.find(item, caches, correction);
			await Cache.set(caches);
		}
		if (!item.trakt) {
			return;
		}
		item.trakt.progress = item.progress;
		await TraktScrobble.start(item);
	}

	async pauseScrobble(): Promise<void> {
		const item = this.parser.getItem();
		if (!item?.trakt) {
			return;
		}
		await TraktScrobble.pause(item);
	}

	async stopScrobble(): Promise<void> {
		this.hasSearchedItem = false;
		const item = this.parser.getItem();
		if (!item?.trakt) {
			return;
		}
		await TraktScrobble.stop(item);
		this.parser.clearItem();
		this.reachedScrobbleThreshold = false;
		this.progress = 0.0;
	}

	async updateProgress(progress: number): Promise<void> {
		const item = this.parser.getItem();
		if (!item) {
			return;
		}
		item.progress = progress;
		if (!item?.trakt) {
			return;
		}
		item.trakt.progress = progress;
		if (!this.reachedScrobbleThreshold && item.trakt.progress > this.scrobbleThreshold) {
			// Update the stored progress after reaching the scrobble threshold to make sure that the item is scrobbled on tab close.
			this.reachedScrobbleThreshold = true;
			const { scrobblingDetails } = await BrowserStorage.get('scrobblingDetails');
			if (scrobblingDetails) {
				scrobblingDetails.item = Item.save(item);
				await BrowserStorage.set({ scrobblingDetails }, false);
				await EventDispatcher.dispatch('SCROBBLE_PROGRESS', null, scrobblingDetails);
			}
		} else if (
			item.progress < this.progress ||
			(this.progress === 0.0 && item.progress > 1.0) ||
			item.progress - this.progress > 10.0
		) {
			// Update the scrobbling item once the progress reaches 1% and then every time it increases by 10%
			this.progress = item.progress;
			const { scrobblingDetails } = await BrowserStorage.get('scrobblingDetails');
			if (scrobblingDetails) {
				scrobblingDetails.item = Item.save(item);
				await BrowserStorage.set({ scrobblingDetails }, false);
				await EventDispatcher.dispatch('SCROBBLE_PROGRESS', null, scrobblingDetails);
			}
		}
	}

	private onItemCorrected = async (data: ItemCorrectedData): Promise<void> => {
		if (!data.newItem.trakt) {
			return;
		}
		const item = this.parser.getItem();
		if (!item) {
			return;
		}
		await this.updateProgress(0.0);
		await this.stopScrobble();
		item.trakt = TraktItem.load(data.newItem.trakt);
		await this.startScrobble();
	};
}
