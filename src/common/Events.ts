import { TraktSearchItem } from '@apis/TraktSearch';
import {
	BrowserStorage,
	ScrobblingDetails,
	StorageValuesOptions,
	StorageValuesSyncOptions,
} from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { DispatchEventMessage, Messaging } from '@common/Messaging';
import { RequestException } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Color } from '@material-ui/lab';
import { Item, SavedItem } from '@models/Item';
import { SavedTraktItem } from '@models/TraktItem';
import { PartialDeep } from 'type-fest';

export interface EventData {
	LOGIN_SUCCESS: LoginSuccessData;
	LOGIN_ERROR: ErrorData;
	LOGOUT_SUCCESS: SuccessData;
	LOGOUT_ERROR: ErrorData;
	SCROBBLE_SUCCESS: ScrobbleSuccessData;
	SCROBBLE_ERROR: ScrobbleErrorData;
	SCROBBLE_START: ScrobblingDetails;
	SCROBBLE_PAUSE: ScrobblingDetails;
	SCROBBLE_STOP: ScrobblingDetails;
	SCROBBLE_PROGRESS: ScrobblingDetails;
	SEARCH_SUCCESS: SearchSuccessData;
	SEARCH_ERROR: SearchErrorData;
	OPTIONS_CHANGE: PartialDeep<StorageValuesOptions>;
	DIALOG_SHOW: DialogShowData;
	SNACKBAR_SHOW: SnackbarShowData;
	MISSING_WATCHED_DATE_DIALOG_SHOW: MissingWatchedDateDialogShowData;
	MISSING_WATCHED_DATE_ADDED: MissingWatchedDateAddedData;
	CORRECTION_DIALOG_SHOW: CorrectionDialogShowData;
	ITEM_CORRECTED: ItemCorrectedData;
	SYNC_OPTIONS_CHANGE: PartialDeep<StorageValuesSyncOptions>;
	SYNC_STORE_UPDATE: SyncStoreUpdateData;
	SERVICE_HISTORY_LOAD_ERROR: ErrorData;
	SERVICE_HISTORY_CHANGE: ServiceHistoryChangeData;
	TRAKT_HISTORY_LOAD_ERROR: ErrorData;
	HISTORY_SYNC_SUCCESS: HistorySyncSuccessData;
	HISTORY_SYNC_ERROR: ErrorData;
	REQUESTS_CANCEL: RequestsCancelData;
	STORAGE_OPTIONS_CHANGE: StorageOptionsChangeData;
	STORAGE_OPTIONS_CLEAR: SuccessData;
	CONTENT_SCRIPT_DISCONNECT: ContentScriptDisconnectData;
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
	item?: SavedTraktItem;
	scrobbleType: number;
}

export type ScrobbleErrorData = ScrobbleSuccessData & {
	error: RequestException;
};

export interface SearchSuccessData {
	searchItem: TraktSearchItem;
}

export interface SearchErrorData {
	error: RequestException;
}

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

export interface CorrectionDialogShowData {
	serviceId: string | null;
	item?: Item;
}

export interface ItemCorrectedData {
	oldItem: SavedItem;
	newItem: SavedItem;
}

export interface SyncStoreUpdateData {
	visibleItemsChanged: boolean;
}

export interface ServiceHistoryChangeData {
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

export interface StorageOptionsChangeData {
	options?: PartialDeep<StorageValuesOptions>;
	syncOptions?: PartialDeep<StorageValuesSyncOptions>;
}

export interface ContentScriptDisconnectData {
	tabId: number;
}

export type EventDispatcherListeners = Record<
	string,
	Record<string, EventDispatcherListener<any>[]>
>;

export type EventDispatcherListener<K extends Event> = (data: EventData[K]) => void | Promise<void>;

class _EventDispatcher {
	/**
	 * Events that are dispatched to all extension pages and content pages.
	 *
	 * **Make sure that all data for global events can be serialized (for example, functions and class instances cannot be passed through global events).**
	 */
	GLOBAL_EVENTS: Event[] = [
		'SCROBBLE_SUCCESS',
		'SCROBBLE_ERROR',
		'SCROBBLE_START',
		'SCROBBLE_PAUSE',
		'SCROBBLE_STOP',
		'SCROBBLE_PROGRESS',
		'SEARCH_ERROR',
		'ITEM_CORRECTED',
		'STORAGE_OPTIONS_CHANGE',
	];

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
		data: EventData[K],
		isExternal = false
	): Promise<void> {
		if (isExternal && eventType === 'STORAGE_OPTIONS_CHANGE') {
			const { options, syncOptions } = data as StorageOptionsChangeData;
			if (options) {
				BrowserStorage.updateOptions(options);
			}
			if (syncOptions) {
				BrowserStorage.updateSyncOptions(syncOptions);
			}
		}

		// Dispatch the event to all other pages
		if (!isExternal && this.GLOBAL_EVENTS.includes(eventType)) {
			const message: DispatchEventMessage = {
				action: 'dispatch-event',
				eventType,
				eventSpecifier,
				data,
			};
			switch (Shared.pageType) {
				case 'background':
				case 'popup':
					void Messaging.toAllContent(message);
				// falls through
				case 'content':
					void Messaging.toExtension(message);
					break;
			}
		}

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
