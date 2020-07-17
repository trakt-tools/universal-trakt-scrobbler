import { TraktScrobble } from '../../api/TraktScrobble';
import { TraktSearch } from '../../api/TraktSearch';
import { Item } from '../../models/Item';
import { TraktItem } from '../../models/TraktItem';
import { BrowserStorage } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { EventDispatcher, Events, ScrobbleProgressEventData } from '../../services/Events';

export interface ScrobbleParser {
	parseItem(): Promise<Item>;
}

export class ScrobbleController {
	parser: ScrobbleParser;
	item: Item | null;
	reachedScrobbleThreshold: boolean;
	scrobbleThreshold: number;

	constructor(parser: ScrobbleParser) {
		this.parser = parser;
		this.item = null;
		this.reachedScrobbleThreshold = false;
		this.scrobbleThreshold = 80.0;
	}

	startListeners = () => {
		EventDispatcher.subscribe(Events.SCROBBLE_START, null, this.onStart);
		EventDispatcher.subscribe(Events.SCROBBLE_PAUSE, null, this.onPause);
		EventDispatcher.subscribe(Events.SCROBBLE_STOP, null, this.onStop);
		EventDispatcher.subscribe(Events.SCROBBLE_PROGRESS, null, this.onProgress);
	};

	onStart = async (): Promise<void> => {
		try {
			this.reachedScrobbleThreshold = false;
			if (!this.item) {
				this.item = await this.parser.parseItem();
			}
			if (this.item) {
				if (!this.item.trakt) {
					this.item.trakt = await TraktSearch.find(this.item);
				}
				if (this.item.trakt) {
					await TraktScrobble.start(this.item.trakt);
					await BrowserStorage.set({ scrobblingItem: TraktItem.getBase(this.item.trakt) }, false);
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
		if (this.item?.trakt) {
			await TraktScrobble.stop(this.item.trakt);
			await BrowserStorage.remove('scrobblingItem');
		}
		this.item = null;
		this.reachedScrobbleThreshold = false;
	};

	onProgress = async (data: ScrobbleProgressEventData): Promise<void> => {
		if (!this.item?.trakt) {
			return;
		}
		this.item.trakt.progress = data.progress;
		if (!this.reachedScrobbleThreshold && this.item.trakt.progress > this.scrobbleThreshold) {
			// Update the stored progress after reaching the scrobble threshold to make sure that the item is scrobbled on tab close.
			await BrowserStorage.set({ scrobblingItem: TraktItem.getBase(this.item.trakt) }, false);
			this.reachedScrobbleThreshold = true;
		}
	};
}
