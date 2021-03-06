import { Color } from '@material-ui/lab';
import { TraktSearchItem } from '../api/TraktSearch';
import { Item, SavedItem } from '../models/Item';
import { TraktItem } from '../models/TraktItem';
import {
	StorageValuesOptions,
	StorageValuesSyncOptions,
	StreamingServiceValue,
} from './BrowserStorage';
import { Errors } from './Errors';
import { RequestException } from './Requests';

export interface EventData {
	LOGIN_SUCCESS: LoginSuccessData;
	LOGIN_ERROR: ErrorData;
	LOGOUT_SUCCESS: SuccessData;
	LOGOUT_ERROR: ErrorData;
	SCROBBLE_SUCCESS: ScrobbleSuccessData;
	SCROBBLE_ERROR: ScrobbleErrorData;
	SCROBBLE_ACTIVE: SuccessData;
	SCROBBLE_INACTIVE: SuccessData;
	SCROBBLE_START: ScrobbleStartData;
	SCROBBLE_PAUSE: SuccessData;
	SCROBBLE_STOP: SuccessData;
	SCROBBLE_PROGRESS: ScrobbleProgressData;
	SEARCH_SUCCESS: SearchSuccessData;
	SEARCH_ERROR: SearchErrorData;
	OPTIONS_CHANGE: OptionsChangeData<keyof StorageValuesOptions>;
	STREAMING_SERVICE_OPTIONS_CHANGE: StreamingServiceOptionsChangeData;
	OPTIONS_CLEAR: SuccessData;
	DIALOG_SHOW: DialogShowData;
	SNACKBAR_SHOW: SnackbarShowData;
	MISSING_WATCHED_DATE_DIALOG_SHOW: MissingWatchedDateDialogShowData;
	MISSING_WATCHED_DATE_ADDED: MissingWatchedDateAddedData;
	WRONG_ITEM_DIALOG_SHOW: WrongItemDialogShowData;
	WRONG_ITEM_CORRECTED: WrongItemCorrectedData;
	HISTORY_OPTIONS_CHANGE: HistoryOptionsChangeData;
	SYNC_STORE_UPDATE: SyncStoreUpdateData;
	STREAMING_SERVICE_HISTORY_LOAD_ERROR: ErrorData;
	STREAMING_SERVICE_HISTORY_CHANGE: StreamingServiceHistoryChangeData;
	TRAKT_HISTORY_LOAD_ERROR: ErrorData;
	HISTORY_SYNC_SUCCESS: HistorySyncSuccessData;
	HISTORY_SYNC_ERROR: ErrorData;
	REQUESTS_CANCEL: RequestsCancelData;
	STORAGE_OPTIONS_CHANGE: SuccessData;
	SCROBBLING_ITEM_UPDATE: ScrobblingItemUpdateData;
}

export type Event = keyof EventData;

export type SuccessData = Record<string, unknown>;

export interface ErrorData {
	error: Error;
}

export interface LoginSuccessData {
	auth: Record<string, unknown>;
}

export interface ScrobbleSuccessData {
	item?: TraktItem;
	scrobbleType: number;
}

export type ScrobbleErrorData = ScrobbleSuccessData & {
	error: RequestException;
};

export interface ScrobbleStartData {
	item?: SavedItem;
}

export interface ScrobbleProgressData {
	progress: number;
}

export interface SearchSuccessData {
	searchItem: TraktSearchItem;
}

export interface SearchErrorData {
	error: RequestException;
}

export interface OptionsChangeData<K extends keyof StorageValuesOptions> {
	id: K;
	value: StorageValuesOptions[K];
}

export type StreamingServiceOptionsChangeData = {
	id: string;
	value: Partial<StreamingServiceValue>;
}[];

export interface DialogShowData {
	title: string;
	message: string;
	onConfirm?: () => void;
	onDeny?: () => void;
}

export interface SnackbarShowData {
	messageName: MessageName;
	messageArgs?: string[];
	severity: Color;
}

export interface MissingWatchedDateDialogShowData {
	serviceId: string | null;
	items: Item[];
}

export interface MissingWatchedDateAddedData {
	items: Item[];
}

export interface WrongItemDialogShowData {
	serviceId: string | null;
	item?: Item;
}

export interface WrongItemCorrectedData {
	item: Item;
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
}

export interface HistoryOptionsChangeData {
	id: keyof StorageValuesSyncOptions;
	value: boolean | number;
}

export interface SyncStoreUpdateData {
	visibleItemsChanged: boolean;
}

export interface StreamingServiceHistoryChangeData {
	index?: number;
	checked: boolean;
}

export interface HistorySyncSuccessData {
	added: {
		episodes: number;
		movies: number;
	};
}

export interface RequestsCancelData {
	key: string;
}

export interface ScrobblingItemUpdateData {
	scrobblingItem?: SavedItem;
}

export type EventDispatcherListeners = Record<
	string,
	Record<string, EventDispatcherListener<any>[]>
>;

export type EventDispatcherListener<K extends Event> = (data: EventData[K]) => void | Promise<void>;

class _EventDispatcher {
	globalSpecifier = 'all';
	listeners: EventDispatcherListeners;

	constructor() {
		this.listeners = {};
	}

	subscribe<K extends Event>(
		eventType: K,
		eventSpecifier: string | null,
		listener: EventDispatcherListener<K>
	): void {
		if (!eventSpecifier) {
			eventSpecifier = this.globalSpecifier;
		}
		if (!this.listeners[eventType]) {
			this.listeners[eventType] = {};
		}
		if (!this.listeners[eventType][eventSpecifier]) {
			this.listeners[eventType][eventSpecifier] = [];
		}
		this.listeners[eventType][eventSpecifier].push(listener);
	}

	unsubscribe<K extends Event>(
		eventType: K,
		eventSpecifier: string | null,
		listener: EventDispatcherListener<K>
	): void {
		if (!this.listeners[eventType]) {
			return;
		}
		if (!eventSpecifier) {
			eventSpecifier = this.globalSpecifier;
		}
		if (this.listeners[eventType][eventSpecifier]) {
			this.listeners[eventType][eventSpecifier] = this.listeners[eventType][eventSpecifier].filter(
				(fn) => fn !== listener
			);
		}
	}

	async dispatch<K extends Event>(
		eventType: K,
		eventSpecifier: string | null,
		data: EventData[K]
	): Promise<void> {
		if (!eventSpecifier) {
			eventSpecifier = this.globalSpecifier;
		}
		const listeners = this.listeners[eventType] && [
			...(this.listeners[eventType][this.globalSpecifier] ?? []),
			...((eventSpecifier !== this.globalSpecifier && this.listeners[eventType][eventSpecifier]) ||
				[]),
		];
		if (!listeners) {
			return;
		}
		for (const listener of listeners) {
			try {
				await listener(data);
			} catch (err) {
				Errors.log('Failed to dispatch.', err);
				throw err;
			}
		}
	}
}

export const EventDispatcher = new _EventDispatcher();
