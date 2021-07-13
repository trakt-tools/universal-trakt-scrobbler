import { ServiceApi } from '@api/ServiceApi';
import { TraktScrobble } from '@api/TraktScrobble';
import { TraktSearch } from '@api/TraktSearch';
import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher, ScrobbleProgressData, WrongItemCorrectedData } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { RequestException } from '@common/Requests';
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
		EventDispatcher.subscribe('WRONG_ITEM_CORRECTED', null, this.onWrongItemCorrected);
	}

	stopListeners() {
		EventDispatcher.unsubscribe('SCROBBLE_START', null, this.onStart);
		EventDispatcher.unsubscribe('SCROBBLE_PAUSE', null, this.onPause);
		EventDispatcher.unsubscribe('SCROBBLE_STOP', null, this.onStop);
		EventDispatcher.unsubscribe('SCROBBLE_PROGRESS', null, this.onProgress);
		EventDispatcher.unsubscribe('WRONG_ITEM_CORRECTED', null, this.onWrongItemCorrected);
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
			const storage = await BrowserStorage.get(['correctItems']);
			const { correctItems } = storage;
			const correctItem = correctItems?.[item.serviceId]?.[item.id];
			item.trakt = await TraktSearch.find(item, correctItem);
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

	private onWrongItemCorrected = async (data: WrongItemCorrectedData): Promise<void> => {
		const item = this.parser.getItem();
		if (!item) {
			return;
		}
		await this.updateProgress(0.0);
		await this.stopScrobble();
		item.trakt = await TraktSearch.find(item, {
			type: data.type,
			traktId: data.traktId,
			url: data.url,
		});
		await this.startScrobble();
		try {
			await Messaging.toBackground({
				action: 'save-correction-suggestion',
				item: Item.save(item),
				url: data.url,
			});
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to save suggestion.', err);
				await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
					messageName: 'saveSuggestionFailed',
					severity: 'error',
				});
			}
		}
	};
}
