import { Item } from '../../models/Item';
import { EventDispatcher, Events, StreamingServiceHistoryChangeData } from '../../services/Events';

export interface StoreData {
	isLastPage: boolean;
	nextPage: number;
	nextVisualPage: number;
	items: Item[];
}

export class Store {
	data: StoreData;
	constructor() {
		this.data = {
			isLastPage: false,
			nextPage: 0,
			nextVisualPage: 0,
			items: [],
		};
	}

	startListeners = (): void => {
		EventDispatcher.subscribe(Events.STREAMING_SERVICE_HISTORY_CHANGE, null, this.onHistoryChange);
		EventDispatcher.subscribe(Events.HISTORY_SYNC_SUCCESS, null, this.onHistorySyncSuccess);
	};

	stopListeners = (): void => {
		EventDispatcher.unsubscribe(
			Events.STREAMING_SERVICE_HISTORY_CHANGE,
			null,
			this.onHistoryChange
		);
		EventDispatcher.unsubscribe(Events.HISTORY_SYNC_SUCCESS, null, this.onHistorySyncSuccess);
	};

	onHistoryChange = (data: StreamingServiceHistoryChangeData): void => {
		const item = this.data.items[data.index];
		if (item) {
			item.isSelected = data.checked;
		}
		void this.update();
	};

	onHistorySyncSuccess = (): void => {
		void this.update();
	};

	selectAll = (): void => {
		for (const item of this.data.items) {
			if (item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt) {
				item.isSelected = true;
			}
		}
		void this.update();
	};

	selectNone = (): void => {
		for (const item of this.data.items) {
			if (item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt) {
				item.isSelected = false;
			}
		}
		void this.update();
	};

	toggleAll = (): void => {
		for (const item of this.data.items) {
			if (item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt) {
				item.isSelected = !item.isSelected;
			}
		}
		void this.update();
	};

	update = async (data?: Partial<StoreData>): Promise<void> => {
		if (data) {
			if (data.items) {
				data.items = data.items.map((item, index) => {
					item.index = index;
					return item;
				});
			}
			this.data = {
				...this.data,
				...data,
				items: [...this.data.items, ...(data.items || [])],
			};
		}
		await EventDispatcher.dispatch(Events.STREAMING_SERVICE_STORE_UPDATE, null, {
			data: this.data,
		});
	};
}
