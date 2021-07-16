import { TraktAuthDetails } from '@apis/TraktAuth';
import { CacheValues } from '@common/Cache';
import { Errors } from '@common/Errors';
import { RequestDetails } from '@common/Requests';
import { Shared } from '@common/Shared';
import { TabProperties } from '@common/Tabs';
import { SavedItem } from '@models/Item';
import { browser, Runtime as WebExtRuntime, Tabs as WebExtTabs } from 'webextension-polyfill-ts';

export type MessageRequest = MessageRequests[keyof MessageRequests];

export interface MessageRequests {
	'open-tab': OpenTabMessage;
	'get-tab-id': GetTabIdMessage;
	'check-login': CheckLoginMessage;
	'finish-login': FinishLoginMessage;
	login: LoginMessage;
	logout: LogoutMessage;
	'get-cache': GetCacheMessage;
	'set-cache': SetCacheMessage;
	'set-title': SetTitleMessage;
	'set-active-icon': SetActiveIconMessage;
	'set-inactive-icon': SetInactiveIconMessage;
	'set-rotating-icon': SetRotatingIconMessage;
	'set-static-icon': SetStaticIconMessage;
	'start-scrobble': StartScrobbleMessage;
	'pause-scrobble': PauseScrobbleMessage;
	'stop-scrobble': StopScrobbleMessage;
	'update-scrobbling-item': UpdateScrobblingItemMessage;
	'get-scrobbling-info': GetScrobblingInfoMessage;
	'send-request': SendRequestMessage;
	'show-notification': ShowNotificationMessage;
	'wrong-item-corrected': WrongItemCorrectedMessage;
	'save-suggestion': SaveSuggestionMessage;
	'check-auto-sync': CheckAutoSyncMessage;
}

export type ReturnType<T extends MessageRequest> = T extends GetCacheMessage
	? ReturnTypes<T['key']>[T['action']]
	: ReturnTypes[T['action']];

export interface ReturnTypes<GetCacheKey extends keyof CacheValues = keyof CacheValues> {
	'open-tab': WebExtTabs.Tab | null;
	'get-tab-id': number | null;
	'check-login': TraktAuthDetails | null;
	'finish-login': void;
	login: TraktAuthDetails;
	logout: void;
	'get-cache': CacheValues[GetCacheKey];
	'set-cache': void;
	'set-title': void;
	'set-active-icon': void;
	'set-inactive-icon': void;
	'set-rotating-icon': void;
	'set-static-icon': void;
	'start-scrobble': void;
	'pause-scrobble': void;
	'stop-scrobble': void;
	'update-scrobbling-item': void;
	'get-scrobbling-info': {
		item: SavedItem | null;
		tabId: number | null;
		isPaused: boolean;
	};
	'send-request': string;
	'show-notification': void;
	'wrong-item-corrected': void;
	'save-suggestion': void;
	'check-auto-sync': void;
}

export interface OpenTabMessage {
	action: 'open-tab';
	url: string;
	extraProperties?: TabProperties;
}

export interface GetTabIdMessage {
	action: 'get-tab-id';
}

export interface CheckLoginMessage {
	action: 'check-login';
}

export interface FinishLoginMessage {
	action: 'finish-login';
	redirectUrl: string;
}

export interface LoginMessage {
	action: 'login';
}

export interface LogoutMessage {
	action: 'logout';
}

export interface GetCacheMessage<K extends keyof CacheValues = keyof CacheValues> {
	action: 'get-cache';
	key: K;
}

export interface SetCacheMessage<K extends keyof CacheValues = keyof CacheValues> {
	action: 'set-cache';
	key: K;
	value: CacheValues[K];
}

export interface SendRequestMessage {
	action: 'send-request';
	request: RequestDetails;
}

export interface SetTitleMessage {
	action: 'set-title';
	title: string;
}

export interface SetActiveIconMessage {
	action: 'set-active-icon';
}

export interface SetInactiveIconMessage {
	action: 'set-inactive-icon';
}

export interface SetRotatingIconMessage {
	action: 'set-rotating-icon';
}

export interface SetStaticIconMessage {
	action: 'set-static-icon';
}

export interface ShowNotificationMessage {
	action: 'show-notification';
	title: string;
	message: string;
}

export interface StartScrobbleMessage {
	action: 'start-scrobble';
	item: SavedItem;
}

export interface PauseScrobbleMessage {
	action: 'pause-scrobble';
}

export interface StopScrobbleMessage {
	action: 'stop-scrobble';
}

export interface UpdateScrobblingItemMessage {
	action: 'update-scrobbling-item';
	item: SavedItem;
}

export interface GetScrobblingInfoMessage {
	action: 'get-scrobbling-info';
}

export interface WrongItemCorrectedMessage {
	action: 'wrong-item-corrected';
	item: SavedItem;
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
}

export interface SaveSuggestionMessage {
	action: 'save-suggestion';
	item: SavedItem;
	url: string;
}

export interface CheckAutoSyncMessage {
	action: 'check-auto-sync';
}

class _Messaging {
	/**
	 * Returning undefined from a message handler means that the response will not be sent back. This is useful for situations where a message is received in multiple places (background, popup, ...) but only one of them is responsible for responding, while the others simply receive the message and do something with it.
	 */
	messageHandlers: {
		[K in keyof MessageRequests]?: (
			message: MessageRequests[K],
			tabId: number | null
		) => Promisable<ReturnType<MessageRequests[K]>> | undefined;
	} = {};

	ports = new Map<number, WebExtRuntime.Port>();

	startListeners() {
		if (Shared.pageType === 'content') {
			browser.runtime.connect();
		} else if (Shared.pageType === 'background') {
			browser.runtime.onConnect.addListener(this.onConnect);
		}
		browser.runtime.onMessage.addListener(this.onMessage);
	}

	stoptListeners() {
		browser.runtime.onMessage.removeListener(this.onMessage);
	}

	private onConnect = (port: WebExtRuntime.Port) => {
		const tabId = port.sender?.tab?.id;
		if (!tabId) {
			return;
		}

		this.ports.set(tabId, port);
		port.onDisconnect.addListener(() => {
			this.ports.delete(tabId);
			if (this.onPortDisconnected) {
				void this.onPortDisconnected(port, tabId);
			}
		});
	};

	onPortDisconnected: ((port: WebExtRuntime.Port, tabId: number) => Promisable<void>) | null = null;

	private onMessage = <T extends MessageRequest>(
		message: T,
		sender: WebExtRuntime.MessageSender
	): Promise<ReturnType<T>> | void => {
		const messageHandler = this.messageHandlers[message.action];
		if (typeof messageHandler === 'undefined') {
			return;
		}
		const executingAction = messageHandler(message as never, sender.tab?.id ?? null) as
			| Promisable<ReturnType<T>>
			| undefined;
		if (typeof executingAction === 'undefined') {
			return;
		}
		return Promise.resolve(executingAction).catch((err: Error) => {
			Errors.log('Failed to execute action.', err);
			throw err.message;
		});
	};

	async toBackground<T extends MessageRequest>(message: T): Promise<ReturnType<T>> {
		const response = ((await browser.runtime.sendMessage(message)) ?? null) as ReturnType<T>;
		return response;
	}

	async toContent<T extends MessageRequest>(message: T, tabId: number): Promise<ReturnType<T>> {
		const response = ((await browser.tabs.sendMessage(tabId, message)) ?? null) as ReturnType<T>;
		return response;
	}
}

export const Messaging = new _Messaging();
