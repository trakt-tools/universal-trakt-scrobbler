import { Item } from '../models/Item';
import { StoreData } from '../modules/history/streaming-services/common/Store';
import { StreamingServiceId } from '../streaming-services';
import { StorageValuesOptions, StorageValuesSyncOptions } from './BrowserStorage';
import { Errors } from './Errors';

export enum Events {
	LOGIN_SUCCESS,
	LOGIN_ERROR,
	LOGOUT_SUCCESS,
	LOGOUT_ERROR,
	SEARCH_SUCCESS,
	SEARCH_ERROR,
	OPTIONS_CHANGE,
	STREAMING_SERVICE_OPTIONS_CHANGE,
	OPTIONS_CLEAR,
	DIALOG_SHOW,
	SNACKBAR_SHOW,
	WRONG_ITEM_DIALOG_SHOW,
	WRONG_ITEM_CORRECTED,
	HISTORY_OPTIONS_CHANGE,
	STREAMING_SERVICE_STORE_UPDATE,
	STREAMING_SERVICE_HISTORY_LOAD_ERROR,
	STREAMING_SERVICE_HISTORY_CHANGE,
	TRAKT_HISTORY_LOAD_ERROR,
	HISTORY_SYNC_SUCCESS,
	HISTORY_SYNC_ERROR,
}

export type EventDispatcherListeners = Record<
	string,
	Record<string, EventDispatcherListener<any>[]>
>;

export type EventDispatcherListener<T> = (data: T) => void | Promise<void>;

export interface HistoryOptionsChangeData {
	id: keyof StorageValuesSyncOptions;
	value: boolean | number;
}

export interface StreamingServiceStoreUpdateData {
	data: StoreData;
}

export interface StreamingServiceHistoryChangeData {
	index: number;
	checked: boolean;
}

export interface WrongItemDialogData {
	serviceId?: StreamingServiceId;
	item?: Item;
}

export interface WrongItemCorrectedData {
	item: Item;
	url: string;
}

export interface HistorySyncSuccessData {
	added: {
		episodes: number;
		movies: number;
	};
}

export interface OptionEventData<K extends keyof StorageValuesOptions> {
	id: K;
	value: StorageValuesOptions[K];
}

export type StreamingServiceOptionEventData<K extends StreamingServiceId> = {
	id: K;
	value: boolean;
}[];

class _EventDispatcher {
	globalSpecifier = 'all';
	listeners: EventDispatcherListeners;

	constructor() {
		this.listeners = {};
	}

	subscribe = <T>(
		eventType: Events,
		eventSpecifier: string | null,
		listener: EventDispatcherListener<T>
	): void => {
		if (!this.listeners[eventType]) {
			this.listeners[eventType] = {};
		}
		if (!this.listeners[eventType][this.globalSpecifier]) {
			this.listeners[eventType][this.globalSpecifier] = [];
		}
		this.listeners[eventType][this.globalSpecifier].push(listener);
		if (!eventSpecifier || eventSpecifier === this.globalSpecifier) {
			return;
		}
		if (!this.listeners[eventType][eventSpecifier]) {
			this.listeners[eventType][eventSpecifier] = [];
		}
		this.listeners[eventType][eventSpecifier].push(listener);
	};

	unsubscribe = <T>(
		eventType: Events,
		eventSpecifier: string | null,
		listener: EventDispatcherListener<T>
	): void => {
		if (!this.listeners[eventType]) {
			return;
		}
		if (this.listeners[eventType][this.globalSpecifier]) {
			this.listeners[eventType][this.globalSpecifier] = this.listeners[eventType][
				this.globalSpecifier
			].filter((fn) => fn !== listener);
		}
		if (
			eventSpecifier &&
			eventSpecifier !== this.globalSpecifier &&
			this.listeners[eventType][eventSpecifier]
		) {
			this.listeners[eventType][eventSpecifier] = this.listeners[eventType][eventSpecifier].filter(
				(fn) => fn !== listener
			);
		}
	};

	dispatch = async (
		eventType: Events,
		eventSpecifier: string | null,
		data: unknown
	): Promise<void> => {
		const listeners =
			this.listeners[eventType] &&
			this.listeners[eventType][eventSpecifier || this.globalSpecifier];
		if (!listeners) {
			return;
		}
		for (const listener of listeners) {
			try {
				await listener(data);
			} catch (err) {
				Errors.log('Failed to dispatch.', err);
			}
		}
	};
}

export const EventDispatcher = new _EventDispatcher();
