import { TraktScrobble } from '../../api/TraktScrobble';
import { TraktSearch } from '../../api/TraktSearch';
import { BrowserStorage, ScrobblingItem } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { EventDispatcher, ScrobbleProgressData, WrongItemCorrectedData } from '../../common/Events';
import { Messaging } from '../../common/Messaging';
import { Item } from '../../models/Item';
import { TraktItem } from '../../models/TraktItem';

export interface ScrobbleParser {
	parseItem(): Promise<Item | undefined>;
}

export class ScrobbleController {
	parser: ScrobbleParser;
	item: Item | undefined;
	reachedScrobbleThreshold: boolean;
	scrobbleThreshold: number;

	constructor(parser: ScrobbleParser) {
		this.parser = parser;
		this.reachedScrobbleThreshold = false;
		this.scrobbleThreshold = 80.0;
	}

	startListeners = () => {
		EventDispatcher.subscribe('SCROBBLE_START', null, this.onStart);
		EventDispatcher.subscribe('SCROBBLE_PAUSE', null, this.onPause);
		EventDispatcher.subscribe('SCROBBLE_STOP', null, this.onStop);
		EventDispatcher.subscribe('SCROBBLE_PROGRESS', null, this.onProgress);
		EventDispatcher.subscribe('WRONG_ITEM_CORRECTED', null, this.onWrongItemCorrected);
	};

	onStart = async (): Promise<void> => {
		try {
			this.reachedScrobbleThreshold = false;
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
					await BrowserStorage.set({ scrobblingItem: this.getScrobblingItem() }, false);
				}
			}
		} catch (err) {
			Errors.log('Failed to parse item.', err);
		}
	};

	onPause = async (): Promise<void> => {
		if (this.item?.trakt) {
			await TraktScrobble.pause(this.item.trakt);
		}
	};

	onStop = async (): Promise<void> => {
		await this.stopScrobble();
		this.item = undefined;
		this.reachedScrobbleThreshold = false;
	};

	stopScrobble = async (): Promise<void> => {
		if (!this.item?.trakt) {
			return;
		}
		await TraktScrobble.stop(this.item.trakt);
		await BrowserStorage.remove('scrobblingItem');
	};

	onProgress = async (data: ScrobbleProgressData): Promise<void> => {
		if (!this.item?.trakt) {
			return;
		}
		this.item.trakt.progress = data.progress;
		if (!this.reachedScrobbleThreshold && this.item.trakt.progress > this.scrobbleThreshold) {
			// Update the stored progress after reaching the scrobble threshold to make sure that the item is scrobbled on tab close.
			await BrowserStorage.set({ scrobblingItem: this.getScrobblingItem() }, false);
			this.reachedScrobbleThreshold = true;
		}
	};

	getScrobblingItem = (): ScrobblingItem | undefined => {
		return this.item?.trakt
			? {
					...Item.getBase(this.item),
					trakt: TraktItem.getBase(this.item.trakt),
					correctionSuggestions: this.item.correctionSuggestions,
			  }
			: undefined;
	};

	onWrongItemCorrected = async (data: WrongItemCorrectedData): Promise<void> => {
		if (!this.item) {
			return;
		}
		await this.onProgress({ progress: 0 });
		await this.stopScrobble();
		this.item.trakt = await TraktSearch.find(this.item, {
			type: data.type,
			traktId: data.traktId,
			url: data.url,
		});
		await this.onStart();
		try {
			const response = await Messaging.toBackground({
				action: 'save-correction-suggestion',
				serviceId: this.item.serviceId,
				item: this.item,
				url: data.url,
			});
			if (response?.error) {
				throw response.error;
			}
		} catch (err) {
			Errors.error('Failed to save suggestion.', err);
			await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'saveSuggestionFailed',
				severity: 'error',
			});
		}
	};
}
