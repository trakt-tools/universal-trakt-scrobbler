import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { BrowserStorage } from '../../../../services/BrowserStorage';
import { Errors } from '../../../../services/Errors';
import { EventDispatcher, Events } from '../../../../services/Events';
import { StreamingServiceId } from '../../../../streaming-services';
import { getStore } from './common';

export abstract class Api {
	id: StreamingServiceId;

	constructor(id: StreamingServiceId) {
		this.id = id;
	}

	abstract loadHistory(
		nextPage: number,
		nextVisualPage: number,
		itemsToLoad: number
	): Promise<void>;

	loadTraktHistory = async () => {
		try {
			const storage = await BrowserStorage.get('correctUrls');
			const { correctUrls } = storage;
			const promises = [];
			const items = getStore(this.id).data.items;
			for (const item of items) {
				promises.push(this.loadTraktItemHistory(item, correctUrls?.[this.id][item.id]));
			}
			await Promise.all(promises);
			await getStore(this.id).update();
		} catch (err) {
			Errors.error('Failed to load Trakt history.', err);
			await EventDispatcher.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, null, {
				error: err as Error,
			});
		}
	};

	loadTraktItemHistory = async (item: Item, url?: string) => {
		if (item.trakt && !url) {
			return;
		}
		try {
			item.trakt = await TraktSearch.find(item, url);
			await TraktSync.loadHistory(item);
		} catch (err) {
			item.trakt = {
				notFound: true,
			};
		}
	};
}
