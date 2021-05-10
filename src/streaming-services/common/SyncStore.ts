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
		void this.dispatchEvent();
	};

	onHistorySyncSuccess = (): void => {
		void this.dispatchEvent();
	};

	selectAll = (): SyncStore => {
		for (const item of this.data.visibleItems) {
			if (item.trakt && !item.trakt.watchedAt) {
				item.isSelected = true;
			}
		}
		return this;
	};

	selectNone = (): SyncStore => {
		for (const item of this.data.visibleItems) {
			item.isSelected = false;
		}
		return this;
	};

	toggleAll = (): SyncStore => {
		for (const item of this.data.visibleItems) {
			if (item.trakt && !item.trakt.watchedAt) {
				item.isSelected = !item.isSelected;
			}
		}
		return this;
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
		const itemsPerPage = this.data.itemsPerPage;
		this.data = {
			...this.data,
			...data,
			items: [...this.data.items, ...(data.items ?? [])].map((item, index) => ({
				...item,
				index,
			})),
			visibleItems: [],
		};
		if (this.data.itemsPerPage !== itemsPerPage && this.data.page > 0) {
			this.updatePage(itemsPerPage);
		}
		return this;
	};

	resetData = (): SyncStore => {
		this.data = SyncStore.getInitialData();
		return this;
	};

	updatePage = (oldItemsPerPage: number): SyncStore => {
		const oldIndex = (this.data.page - 1) * oldItemsPerPage;
		const newPage = Math.floor(oldIndex / this.data.itemsPerPage) + 1;
		this.data.page = newPage;
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
		return this.dispatchEvent();
	};

	dispatchEvent = (): Promise<void> => {
		return EventDispatcher.dispatch('SYNC_STORE_UPDATE', null, {
			data: this.data,
		});
	};
}
