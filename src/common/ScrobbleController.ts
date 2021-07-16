import { ServiceApi } from '@apis/ServiceApi';
import { TraktScrobble } from '@apis/TraktScrobble';
import { TraktSearch } from '@apis/TraktSearch';
import { BrowserStorage } from '@common/BrowserStorage';
import { EventDispatcher, ItemCorrectedData, ScrobbleProgressData } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { getScrobbleParser, ScrobbleParser } from '@common/ScrobbleParser';
import { Shared } from '@common/Shared';
import { Item } from '@models/Item';

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

	constructor(parser: ScrobbleParser) {
		this.parser = parser;
		this.api = this.parser.api;
	}

	startListeners() {
		EventDispatcher.subscribe('SCROBBLE_START', null, this.onStart);
		EventDispatcher.subscribe('SCROBBLE_PAUSE', null, this.onPause);
		EventDispatcher.subscribe('SCROBBLE_STOP', null, this.onStop);
		EventDispatcher.subscribe('SCROBBLE_PROGRESS', null, this.onProgress);
		EventDispatcher.subscribe('ITEM_CORRECTED', null, this.onItemCorrected);
	}

	stopListeners() {
		EventDispatcher.unsubscribe('SCROBBLE_START', null, this.onStart);
		EventDispatcher.unsubscribe('SCROBBLE_PAUSE', null, this.onPause);
		EventDispatcher.unsubscribe('SCROBBLE_STOP', null, this.onStop);
		EventDispatcher.unsubscribe('SCROBBLE_PROGRESS', null, this.onProgress);
		EventDispatcher.unsubscribe('ITEM_CORRECTED', null, this.onItemCorrected);
	}

	private onStart = (): Promise<void> => {
		return this.startScrobble();
	};

	private onPause = (): Promise<void> => {
		return this.pauseScrobble();
	};

	private onStop = (): Promise<void> => {
		return this.stopScrobble();
	};

	private onProgress = (data: ScrobbleProgressData): Promise<void> => {
		return this.updateProgress(data.progress);
	};

	async startScrobble(): Promise<void> {
		const item = this.parser.getItem();
		if (!item) {
			return;
		}
		this.reachedScrobbleThreshold = false;
		this.progress = 0.0;
		if (!item.trakt && !this.hasSearchedItem) {
			this.hasSearchedItem = true;
			const storage = await BrowserStorage.get(['corrections']);
			const { corrections } = storage;
			const databaseId = item.getDatabaseId();
			const correction = corrections?.[databaseId];
			item.trakt = await TraktSearch.find(item, correction);
		}
		if (!item.trakt) {
			return;
		}
		item.trakt.progress = item.progress;
		await TraktScrobble.start(item.trakt);
		if (Shared.pageType !== 'background') {
			await Messaging.toBackground({
				action: 'start-scrobble',
				item: Item.save(item),
			});
		}
	}

	async pauseScrobble(): Promise<void> {
		const item = this.parser.getItem();
		if (!item?.trakt) {
			return;
		}
		await TraktScrobble.pause(item.trakt);
		if (Shared.pageType !== 'background') {
			await Messaging.toBackground({ action: 'pause-scrobble' });
		}
	}

	async stopScrobble(): Promise<void> {
		this.hasSearchedItem = false;
		const item = this.parser.getItem();
		if (!item?.trakt) {
			return;
		}
		await TraktScrobble.stop(item.trakt);
		if (Shared.pageType !== 'background') {
			await Messaging.toBackground({ action: 'stop-scrobble' });
		}
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
			await Messaging.toBackground({
				action: 'update-scrobbling-item',
				item: Item.save(item),
			});
		} else if (
			item.progress < this.progress ||
			(this.progress === 0.0 && item.progress > 1.0) ||
			item.progress - this.progress > 10.0
		) {
			// Update the scrobbling item once the progress reaches 1% and then every time it increases by 10%
			this.progress = item.progress;
			await Messaging.toBackground({
				action: 'update-scrobbling-item',
				item: Item.save(item),
			});
		}
	}

	private onItemCorrected = async (data: ItemCorrectedData): Promise<void> => {
		const item = this.parser.getItem();
		if (!item) {
			return;
		}
		await this.updateProgress(0.0);
		await this.stopScrobble();
		item.trakt = data.newItem.trakt;
		await this.startScrobble();
	};
}
