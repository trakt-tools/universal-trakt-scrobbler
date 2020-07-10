import { StoreData } from '../modules/history/streaming-services/common/Store';
import { StorageValuesSyncOptions } from './BrowserStorage';
import { Errors } from './Errors';

export enum Events {
	LOGIN_SUCCESS,
	LOGIN_ERROR,
	LOGOUT_SUCCESS,
	LOGOUT_ERROR,
	SEARCH_SUCCESS,
	SEARCH_ERROR,
	OPTIONS_CHANGE,
	OPTIONS_CLEAR,
	DIALOG_SHOW,
	SNACKBAR_SHOW,
	HISTORY_OPTIONS_CHANGE,
	STREAMING_SERVICE_STORE_UPDATE,
	STREAMING_SERVICE_HISTORY_LOAD_ERROR,
	STREAMING_SERVICE_HISTORY_CHANGE,
	TRAKT_HISTORY_LOAD_ERROR,
	HISTORY_SYNC_SUCCESS,
	HISTORY_SYNC_ERROR,
}

export type EventDispatcherListeners = {
	[key: number]: EventDispatcherListener<any>[];
};

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

export interface HistorySyncSuccessData {
	added: {
		episodes: number;
		movies: number;
	};
}

export interface OptionEventData {
	id: string;
	checked: boolean;
}

class _EventDispatcher {
	listeners: EventDispatcherListeners;

	constructor() {
		this.listeners = {};
	}

	subscribe = <T>(eventType: Events, listener: EventDispatcherListener<T>): void => {
		if (!this.listeners[eventType]) {
			this.listeners[eventType] = [];
		}
		this.listeners[eventType].push(listener);
	};

	unsubscribe = <T>(eventType: Events, listener: EventDispatcherListener<T>): void => {
		if (this.listeners[eventType]) {
			this.listeners[eventType] = this.listeners[eventType].filter((fn) => fn !== listener);
		}
	};

	dispatch = async (eventType: Events, data: Record<string, unknown>): Promise<void> => {
		if (this.listeners[eventType]) {
			for (const listener of this.listeners[eventType]) {
				try {
					await listener(data);
				} catch (err) {
					Errors.log('Failed to dispatch.', err);
				}
			}
		}
	};
}

export const EventDispatcher = new _EventDispatcher();
