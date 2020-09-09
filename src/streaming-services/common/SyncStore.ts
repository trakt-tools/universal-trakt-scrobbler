import { Item } from '../../models/Item';
import { EventDispatcher, StreamingServiceHistoryChangeData } from '../../common/Events';

export interface StoreData {
	isLastPage: boolean;
	nextPage: number;
	nextVisualPage: number;
	items: Item[];
}

export class SyncStore {
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
		EventDispatcher.subscribe('STREAMING_SERVICE_HISTORY_CHANGE', null, this.onHistoryChange);
		EventDispatcher.subscribe('HISTORY_SYNC_SUCCESS', null, this.onHistorySyncSuccess);
	};

	stopListeners = (): void => {
		EventDispatcher.unsubscribe('STREAMING_SERVICE_HISTORY_CHANGE', null, this.onHistoryChange);
		EventDispatcher.unsubscribe('HISTORY_SYNC_SUCCESS', null, this.onHistorySyncSuccess);
	};

	onHistoryChange = (data: StreamingServiceHistoryChangeData): void => {
		if (typeof data.index === 'undefined') {
			return;
		}
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

	update = async (data?: Partial<StoreData>, doClear = false): Promise<void> => {
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
				items: doClear ? [...(data.items || [])] : [...this.data.items, ...(data.items || [])],
			};
		}
		await EventDispatcher.dispatch('STREAMING_SERVICE_STORE_UPDATE', null, {
			data: this.data,
		});
	};
}
