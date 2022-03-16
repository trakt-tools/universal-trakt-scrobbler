import { Shared } from '@common/Shared';
import { ScrobbleItem } from '@models/Item';

export interface SyncStoreData {
	isLoading: boolean;
	loadQueue: number[];
	items: ScrobbleItem[];
	hasReachedEnd: boolean;
	hasReachedLastSyncDate: boolean;
}

const syncStores = new Map<string, SyncStore>();

export const getSyncStore = (serviceId: string | null): SyncStore => {
	const storeId = serviceId || 'multiple';
	if (!syncStores.has(storeId)) {
		syncStores.set(storeId, new SyncStore(storeId));
	}
	const store = syncStores.get(storeId);
	if (!store) {
		throw new Error(`Sync store not registered for ${serviceId || 'null'}`);
	}
	return store;
};

export class SyncStore {
	id: string;
	data: SyncStoreData;

	constructor(id: string) {
		this.id = id;
		this.data = SyncStore.getInitialData();
	}

	static getInitialData(): SyncStoreData {
		return {
			isLoading: false,
			loadQueue: [],
			items: [],
			hasReachedEnd: false,
			hasReachedLastSyncDate: false,
		};
	}

	async selectAll(): Promise<SyncStore> {
		const newItems: ScrobbleItem[] = [];
		for (const item of this.data.items) {
			if (!item.isSelected && item.isSelectable()) {
				const newItem = item.clone();
				newItem.isSelected = true;
				newItems.push(newItem);
			}
		}
		await this.update(newItems, true);
		return this;
	}

	async selectNone(): Promise<SyncStore> {
		const newItems: ScrobbleItem[] = [];
		for (const item of this.data.items) {
			if (item.isSelected) {
				const newItem = item.clone();
				newItem.isSelected = false;
				newItems.push(newItem);
			}
		}
		await this.update(newItems, true);
		return this;
	}

	async toggleAll(): Promise<SyncStore> {
		const newItems: ScrobbleItem[] = [];
		for (const item of this.data.items) {
			if (item.isSelected || (!item.isSelected && item.isSelectable())) {
				const newItem = item.clone();
				newItem.isSelected = !newItem.isSelected;
				newItems.push(newItem);
			}
		}
		await this.update(newItems, true);
		return this;
	}

	areItemsMissingWatchedDate(): boolean {
		let missingCount = 0;
		return this.data.items.some((item) => {
			if (item.isMissingWatchedDate()) {
				missingCount += 1;
			}
			return missingCount > 1;
		});
	}

	async setData(data: Partial<SyncStoreData>): Promise<SyncStore> {
		let index = this.data.items.length;
		this.data = {
			...this.data,
			...data,
			items: [...this.data.items, ...(data.items || [])],
		};
		if (data.items) {
			for (const item of data.items) {
				item.index = index;
				item.isLoading = true;
				index += 1;
			}
			await this.dispatchUpdate(data.items);
		}
		return this;
	}

	async resetData(): Promise<SyncStore> {
		this.data = SyncStore.getInitialData();
		await Shared.events.dispatch('SYNC_STORE_RESET', null, {});
		return this;
	}

	/**
	 * Updates items for immutability.
	 */
	async update(newItems: ScrobbleItem[], doDispatch: boolean): Promise<SyncStore> {
		for (const newItem of newItems) {
			this.data.items[newItem.index] = newItem;
		}
		if (doDispatch) {
			await this.dispatchUpdate(newItems);
		}
		return this;
	}

	async dispatchUpdate(newItems: ScrobbleItem[]): Promise<SyncStore> {
		if (newItems.length === 0) {
			return this;
		}
		const eventData: Record<number, ScrobbleItem> = {};
		for (const newItem of newItems) {
			eventData[newItem.index] = newItem;
		}
		await Shared.events.dispatch('ITEMS_LOAD', null, {
			items: eventData,
		});
		return this;
	}
}
