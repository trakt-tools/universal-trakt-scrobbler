import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
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
			let promises = [];
			const items = getStore('netflix').data.items;
			promises = items.map(this.loadTraktItemHistory);
			await Promise.all(promises);
			await getStore('netflix').update();
		} catch (err) {
			Errors.error('Failed to load Trakt history.', err);
			await EventDispatcher.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, null, {
				error: err as Error,
			});
		}
	};

	loadTraktItemHistory = async (item: Item) => {
		if (!item.trakt) {
			try {
				item.trakt = await TraktSearch.find(item);
				await TraktSync.loadHistory(item);
			} catch (err) {
				item.trakt = {
					notFound: true,
				};
			}
		}
	};
}
