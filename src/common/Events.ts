import { TraktSearchItem } from '@apis/TraktSearch';
import {
	ScrobblingDetails,
	StorageValuesOptions,
	StorageValuesSyncOptions,
} from '@common/BrowserStorage';
import { DispatchEventMessage, Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { TraktItemValues } from '@models/TraktItem';
import { AlertColor } from '@mui/material';
import { SyncStore } from '@stores/SyncStore';
import { ReactNode } from 'react';
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
	SCROBBLING_ITEM_CORRECTED: ItemCorrectedData;
	SYNC_OPTIONS_CHANGE: PartialDeep<StorageValuesSyncOptions>;
	SYNC_STORE_RESET: SuccessData;
	SERVICE_HISTORY_LOAD_ERROR: ErrorData;
	TRAKT_HISTORY_LOAD_ERROR: ErrorData;
	HISTORY_SYNC_SUCCESS: HistorySyncSuccessData;
	HISTORY_SYNC_ERROR: ErrorData;
	REQUESTS_CANCEL: RequestsCancelData;
	STORAGE_OPTIONS_CHANGE: StorageOptionsChangeData;
	STORAGE_OPTIONS_CLEAR: SuccessData;
	CONTENT_SCRIPT_CONNECT: ContentScriptConnectData;
	CONTENT_SCRIPT_DISCONNECT: ContentScriptConnectData;
	SYNC_DIALOG_SHOW: SyncDialogShowData;
	ITEMS_LOAD: ItemsLoadData;
	SYNC_STORE_LOADING_START: SuccessData;
	SYNC_STORE_LOADING_STOP: SuccessData;
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
	item?: TraktItemValues;
	scrobbleType: number;
}

export type ScrobbleErrorData = ScrobbleSuccessData & {
	error: Error;
};

export interface SearchSuccessData {
	searchItem: TraktSearchItem;
}

export interface SearchErrorData {
	error: Error;
}

export interface DialogShowData {
	title: string | ReactNode;
	message: string | ReactNode;
	onConfirm?: () => Promisable<void>;
	onDeny?: () => Promisable<void>;
}

export interface SnackbarShowData {
	messageName: MessageName;
	messageArgs?: string[];
	severity: AlertColor;
}

export interface MissingWatchedDateDialogShowData {
	items: ScrobbleItem[];
}

export interface MissingWatchedDateAddedData {
	oldItems: ScrobbleItem[];
	newItems: ScrobbleItem[];
}

export interface CorrectionDialogShowData {
	item?: ScrobbleItem;
	isScrobblingItem: boolean;
}

export interface ItemCorrectedData {
	oldItem: ScrobbleItemValues;
	newItem: ScrobbleItemValues;
}

export interface HistorySyncSuccessData {
	added: {
		episodes: number;
		movies: number;
	};
}

export interface RequestsCancelData {
	tabId: number | null;
	key: string;
}

export interface StorageOptionsChangeData {
	options?: PartialDeep<StorageValuesOptions>;
	syncOptions?: PartialDeep<StorageValuesSyncOptions>;
}

export interface ContentScriptConnectData {
	tabId: number;
}

export interface SyncDialogShowData {
	store: SyncStore;
	serviceId: string | null;
	items: ScrobbleItem[];
}

export interface ItemsLoadData {
	items: Partial<Record<number, ScrobbleItem | null>>;
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
		'SCROBBLING_ITEM_CORRECTED',
		'STORAGE_OPTIONS_CHANGE',
		'CONTENT_SCRIPT_CONNECT',
		'CONTENT_SCRIPT_DISCONNECT',
		'REQUESTS_CANCEL',
	];

	globalSpecifier = 'all';
	listeners: EventDispatcherListeners;

	constructor() {
		this.listeners = {};
	}

	init() {
		// Do nothing
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
				Shared.storage.updateOptions(options);
			}
			if (syncOptions) {
				Shared.storage.updateSyncOptions(syncOptions);
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
				if (Shared.errors.validate(err)) {
					Shared.errors.log('Failed to dispatch.', err);
				}
				throw err;
			}
		}
	}
}

export const EventDispatcher = new _EventDispatcher();

Shared.events = EventDispatcher;
