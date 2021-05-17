import { BrowserStorage } from '../../common/BrowserStorage';
import { EventDispatcher, StreamingServiceHistoryChangeData } from '../../common/Events';
import { Item } from '../../models/Item';
import { StreamingServiceId } from '../streaming-services';

export type SyncStoreId = StreamingServiceId | 'multiple';

export interface SyncStoreData {
	items: Item[];
	visibleItems: Item[];
	selectedItems: Item[];
	page: number;
	itemsPerPage: number;
	nextPage: number;
	hasReachedEnd: boolean;
}

export class SyncStore {
	id: SyncStoreId;
	data: SyncStoreData;

	constructor(id: SyncStoreId) {
		this.id = id;
		this.data = SyncStore.getInitialData();
	}

	static getInitialData = (): SyncStoreData => {
		return {
			items: [],
			visibleItems: [],
			selectedItems: [],
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
			this.data.selectedItems = this.data.visibleItems.filter((item) => item.isSelected);
		}
		void this.dispatchEvent(false);
	};

	onHistorySyncSuccess = (): void => {
		void this.dispatchEvent(false);
	};

	selectAll = (): SyncStore => {
		for (const item of this.data.visibleItems) {
			if (item.isSelectable()) {
				item.isSelected = true;
			}
		}
		this.data.selectedItems = this.data.visibleItems.filter((item) => item.isSelected);
		return this;
	};

	selectNone = (): SyncStore => {
		for (const item of this.data.visibleItems) {
			item.isSelected = false;
		}
		this.data.selectedItems = this.data.visibleItems.filter((item) => item.isSelected);
		return this;
	};

	toggleAll = (): SyncStore => {
		for (const item of this.data.visibleItems) {
			if (item.isSelectable()) {
				item.isSelected = !item.isSelected;
			}
		}
		this.data.selectedItems = this.data.visibleItems.filter((item) => item.isSelected);
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
			items: [...this.data.items, ...(data.items ?? [])],
			visibleItems: [],
			selectedItems: [],
		};
		for (const [index, item] of this.data.items.entries()) {
			item.index = index;
			item.isSelected = false;
		}
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

	update = (data?: Partial<SyncStoreData>): Promise<void> => {
		if (data) {
			this.setData(data);
		}
		return this.updateVisibleItems(true);
	};

	updateVisibleItems = (visibleItemsChanged: boolean): Promise<void> => {
		this.data.visibleItems = [];
		if (this.data.page > 0) {
			this.data.visibleItems = this.data.items.slice(
				(this.data.page - 1) * this.data.itemsPerPage,
				this.data.page * this.data.itemsPerPage
			);
		} else if (this.id === 'multiple') {
			this.data.visibleItems = [...this.data.items];
		}
		if (this.data.visibleItems.length > 0) {
			if (BrowserStorage.syncOptions.hideSynced) {
				this.data.visibleItems = this.data.visibleItems.filter((item) => !item.trakt?.watchedAt);
			}
			this.data.visibleItems = this.data.visibleItems.filter(
				(item) =>
					typeof item.percentageWatched === 'undefined' ||
					item.percentageWatched >= BrowserStorage.syncOptions.minPercentageWatched
			);
		}
		return this.dispatchEvent(visibleItemsChanged);
	};

	dispatchEvent = (visibleItemsChanged: boolean): Promise<void> => {
		return EventDispatcher.dispatch('SYNC_STORE_UPDATE', null, { visibleItemsChanged });
	};
}
