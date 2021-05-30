import { TraktScrobble } from '../../api/TraktScrobble';
import { TraktSearch } from '../../api/TraktSearch';
import { BrowserStorage } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { EventDispatcher, ScrobbleProgressData, WrongItemCorrectedData } from '../../common/Events';
import { Messaging } from '../../common/Messaging';
import { RequestException } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { Item } from '../../models/Item';

export interface ScrobbleParser {
	parseItem(): Promise<Item | undefined> | Item | undefined;
}

export class ScrobbleController {
	parser: ScrobbleParser;
	item: Item | undefined;
	reachedScrobbleThreshold: boolean;
	scrobbleThreshold: number;
	progress = 0.0;

	constructor(parser: ScrobbleParser) {
		this.parser = parser;
		this.reachedScrobbleThreshold = false;
		this.scrobbleThreshold = 80.0;
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

	onStart = (): Promise<void> => {
		return this.startScrobble();
	};

	onPause = (): Promise<void> => {
		return this.pauseScrobble();
	};

	onStop = (): Promise<void> => {
		return this.stopScrobble();
	};

	onProgress = (data: ScrobbleProgressData): Promise<void> => {
		return this.updateProgress(data.progress);
	};

	async startScrobble(): Promise<void> {
		try {
			this.reachedScrobbleThreshold = false;
			this.progress = 0.0;
			if (!this.item) {
				this.item = await this.parser.parseItem();
			}
			if (this.item) {
				if (!this.item.trakt) {
					const storage = await BrowserStorage.get(['correctItems']);
					const { correctItems } = storage;
					const correctItem = correctItems?.[this.item.serviceId]?.[this.item.id];
					this.item.trakt = await TraktSearch.find(this.item, correctItem);
				}
				if (this.item.trakt) {
					await TraktScrobble.start(this.item.trakt);
					if (Shared.pageType !== 'background') {
						await Messaging.toBackground({
							action: 'start-scrobble',
							item: Item.save(this.item),
						});
					}
				}
			}
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.log('Failed to parse item.', err);
			}
		}
	}

	async pauseScrobble(): Promise<void> {
		if (this.item?.trakt) {
			await TraktScrobble.pause(this.item.trakt);
			if (Shared.pageType !== 'background') {
				await Messaging.toBackground({ action: 'pause-scrobble' });
			}
		}
	}

	async stopScrobble(): Promise<void> {
		if (!this.item?.trakt) {
			return;
		}
		await TraktScrobble.stop(this.item.trakt);
		if (Shared.pageType !== 'background') {
			await Messaging.toBackground({ action: 'stop-scrobble' });
		}
		this.item = undefined;
		this.reachedScrobbleThreshold = false;
		this.progress = 0.0;
	}

	async updateProgress(progress: number): Promise<void> {
		if (!this.item) {
			return;
		}
		this.item.progress = progress;
		if (!this.item?.trakt) {
			return;
		}
		this.item.trakt.progress = progress;
		if (!this.reachedScrobbleThreshold && this.item.trakt.progress > this.scrobbleThreshold) {
			// Update the scrobbling item after reaching the scrobble threshold to make sure that the item is scrobbled on tab close
			this.reachedScrobbleThreshold = true;
			await Messaging.toBackground({
				action: 'update-scrobbling-item',
				item: Item.save(this.item),
			});
		} else if (
			this.item.progress < this.progress ||
			(this.progress === 0.0 && this.item.progress > 1.0) ||
			this.item.progress - this.progress > 10.0
		) {
			// Update the scrobbling item once the progress reaches 1% and then every time it increases by 10%
			this.progress = this.item.progress;
			await Messaging.toBackground({
				action: 'update-scrobbling-item',
				item: Item.save(this.item),
			});
		}
	}

	onWrongItemCorrected = async (data: WrongItemCorrectedData): Promise<void> => {
		if (!this.item) {
			return;
		}
		await this.updateProgress(0.0);
		await this.stopScrobble();
		this.item.trakt = await TraktSearch.find(this.item, {
			type: data.type,
			traktId: data.traktId,
			url: data.url,
		});
		await this.startScrobble();
		try {
			await Messaging.toBackground({
				action: 'save-correction-suggestion',
				item: Item.save(this.item),
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
