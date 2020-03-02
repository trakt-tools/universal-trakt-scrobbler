import { Events, EventDispatcher, StreamingServiceHistoryChangeData } from '../../../../services/Events';
import { Item } from '../../../../models/Item';

export interface StoreData {
  isLastPage: boolean;
  nextPage: number;
  nextVisualPage: number;
  items: Item[]
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

    this.startListeners = this.startListeners.bind(this);
    this.stopListeners = this.stopListeners.bind(this);
    this.onHistoryChange = this.onHistoryChange.bind(this);
    this.onHistorySyncSuccess = this.onHistorySyncSuccess.bind(this);
    this.selectAll = this.selectAll.bind(this);
    this.selectNone = this.selectNone.bind(this);
    this.toggleAll = this.toggleAll.bind(this);
    this.update = this.update.bind(this);
  }

  startListeners() {
    EventDispatcher.subscribe(Events.STREAMING_SERVICE_HISTORY_CHANGE, this.onHistoryChange);
    EventDispatcher.subscribe(Events.HISTORY_SYNC_SUCCESS, this.onHistorySyncSuccess);
  }

  stopListeners() {
    EventDispatcher.unsubscribe(Events.STREAMING_SERVICE_HISTORY_CHANGE, this.onHistoryChange);
    EventDispatcher.unsubscribe(Events.HISTORY_SYNC_SUCCESS, this.onHistorySyncSuccess);
  }

  onHistoryChange(data: StreamingServiceHistoryChangeData) {
    const item = this.data.items[data.index];
    if (item) {
      item.isSelected = data.checked;
    }
    this.update(null);
  }

  onHistorySyncSuccess() {
    this.update(null);
  }

  selectAll() {
    for (const item of this.data.items) {
      if (item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt) {
        item.isSelected = true;
      }
    }
    this.update(null);
  }

  selectNone() {
    for (const item of this.data.items) {
      if (item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt) {
        item.isSelected = false;
      }
    }
    this.update(null);
  }

  toggleAll() {
    for (const item of this.data.items) {
      if (item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt) {
        item.isSelected = !item.isSelected;
      }
    }
    this.update(null);
  }

  async update(data: Partial<StoreData>) {
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
    await EventDispatcher.dispatch(Events.STREAMING_SERVICE_STORE_UPDATE, { data: this.data });
  }
}

