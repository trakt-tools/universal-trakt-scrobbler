import { EventDispatcher, StreamingServiceHistoryChangeData } from '../../common/Events';
import { Item } from '../../models/Item';

export interface SyncStoreData {
	items: Item[];
	visibleItems: Item[];
	page: number;
	itemsPerPage: number;
	nextPage: number;
	hasReachedEnd: boolean;
}

export class SyncStore {
	data: SyncStoreData;

	constructor() {
		this.data = SyncStore.getInitialData();
	}

	static getInitialData = (): SyncStoreData => {
		return {
			items: [],
			visibleItems: [],
			page: 0,
			itemsPerPage: 0,
			nextPage: 0,
			hasReachedEnd: false,
		};
	};

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

	goToPreviousPage = (): SyncStore => {
		if (this.data.page > 1) {
			this.data.page -= 1;
		}
		return this;
	};

	goToNextPage = (): SyncStore => {
		this.data.page += 1;
		return this;
	};

	setData = (data: Partial<SyncStoreData>): SyncStore => {
		this.data = {
			...this.data,
			...data,
			items: [...this.data.items, ...(data.items ?? [])].map((item, index) => ({
				...item,
				index,
			})),
			visibleItems: [],
		};
		return this;
	};

	resetData = (): SyncStore => {
		this.data = SyncStore.getInitialData();
		return this;
	};

	updateVisibleItems = (): SyncStore => {
		this.data.visibleItems = [];
		if (this.data.page > 0) {
			this.data.visibleItems = this.data.items.slice(
				(this.data.page - 1) * this.data.itemsPerPage,
				this.data.page * this.data.itemsPerPage
			);
		}
		return this;
	};

	update = (data?: Partial<SyncStoreData>): Promise<void> => {
		if (data) {
			this.setData(data);
		}
		this.updateVisibleItems();
		return EventDispatcher.dispatch('SYNC_STORE_UPDATE', null, {
			data: this.data,
		});
	};
}
