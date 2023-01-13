import { TraktAuthDetails } from '@apis/TraktAuth';
import { Event, EventData } from '@common/Events';
import { RequestDetails } from '@common/Requests';
import { RequestError, RequestErrorOptions } from '@common/RequestError';
import { Shared } from '@common/Shared';
import { TabProperties } from '@common/Tabs';
import browser, { Runtime as WebExtRuntime, Tabs as WebExtTabs } from 'webextension-polyfill';

export type MessageRequest = MessageRequests[keyof MessageRequests];

export interface MessageRequests {
	'open-tab': OpenTabMessage;
	'get-tab-id': GetTabIdMessage;
	'validate-trakt-token': ValidateTraktTokenMessage;
	'finish-login': FinishLoginMessage;
	login: LoginMessage;
	logout: LogoutMessage;
	'set-title': SetTitleMessage;
	'set-active-icon': SetActiveIconMessage;
	'set-inactive-icon': SetInactiveIconMessage;
	'set-rotating-icon': SetRotatingIconMessage;
	'set-static-icon': SetStaticIconMessage;
	'send-request': SendRequestMessage;
	'show-notification': ShowNotificationMessage;
	'dispatch-event': DispatchEventMessage;
	'send-to-all-content': SendToAllContentMessage;
	'inject-function': InjectFunctionMessage;
}

export type ReturnType<T extends MessageRequest> = ReturnTypes[T['action']];

export interface ReturnTypes {
	'open-tab': WebExtTabs.Tab | null;
	'get-tab-id': number | null;
	'validate-trakt-token': TraktAuthDetails | null;
	'finish-login': void;
	login: TraktAuthDetails;
	logout: void;
	'set-title': void;
	'set-active-icon': void;
	'set-inactive-icon': void;
	'set-rotating-icon': void;
	'set-static-icon': void;
	'send-request': string;
	'show-notification': void;
	'dispatch-event': void;
	'send-to-all-content': void;
	'inject-function': unknown;
}

export interface OpenTabMessage {
	action: 'open-tab';
	url: string;
	extraProperties?: TabProperties;
}

export interface GetTabIdMessage {
	action: 'get-tab-id';
}

export interface ValidateTraktTokenMessage {
	action: 'validate-trakt-token';
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

export interface DispatchEventMessage<T extends Event = Event> {
	action: 'dispatch-event';
	eventType: T;
	eventSpecifier: string | null;
	data: EventData[T];
}

export interface SendToAllContentMessage {
	action: 'send-to-all-content';
	message: Exclude<MessageRequest, SendToAllContentMessage>;
}

export interface InjectFunctionMessage {
	action: 'inject-function';
	serviceId: string;
	key: string;
	url: string;
	fnStr: string;
	fnParamsStr: string;
}

export type MessageHandlers = {
	[K in keyof MessageRequests]?: (
		message: MessageRequests[K],
		tabId: number | null
	) => Promisable<ReturnType<MessageRequests[K]>> | undefined;
};

export type MessagingError =
	| {
			instance: 'Error';
			data: {
				message: string;
			};
	  }
	| {
			instance: 'RequestError';
			data: RequestErrorOptions;
	  };

class _Messaging {
	/**
	 * Returning undefined from a message handler means that the response will not be sent back. This is useful for situations where a message is received in multiple places (background, popup, ...) but only one of them is responsible for responding, while the others simply receive the message and do something with it.
	 */
	private messageHandlers: MessageHandlers = {
		'dispatch-event': (message) =>
			Shared.events.dispatch(message.eventType, message.eventSpecifier, message.data, true),
	};

	ports = new Map<number, WebExtRuntime.Port>();

	init() {
		if (Shared.pageType === 'background') {
			browser.runtime.onConnect.addListener(this.onConnect);
		} else if (Shared.pageType === 'content') {
			browser.runtime.connect();
		}
		browser.runtime.onMessage.addListener(this.onMessage);
	}

	private onConnect = (port: WebExtRuntime.Port) => {
		const tabId = port.sender?.tab?.id;
		if (!tabId) {
			return;
		}

		this.ports.set(tabId, port);
		void Shared.events.dispatch('CONTENT_SCRIPT_CONNECT', null, { tabId });

		port.onDisconnect.addListener(() => {
			this.ports.delete(tabId);
			void Shared.events.dispatch('CONTENT_SCRIPT_DISCONNECT', null, { tabId });
		});
	};

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
			Shared.errors.log('Failed to execute action.', err);

			if (err instanceof RequestError) {
				throw new Error(
					JSON.stringify({
						instance: 'RequestError',
						data: {
							request: err.request,
							status: err.status,
							text: err.text,
							isCanceled: err.isCanceled,
							extra: err.extra,
						},
					})
				);
			}

			throw new Error(
				JSON.stringify({
					instance: 'Error',
					data: {
						message: err.message,
					},
				})
			);
		});
	};

	addHandlers(messageHandlers: MessageHandlers) {
		this.messageHandlers = {
			...this.messageHandlers,
			...messageHandlers,
		};
	}

	/**
	 * Sends a message to all extension pages (so it will be sent to the background page, the popup page, the history page and the options page, if all of them are open).
	 */
	async toExtension<T extends MessageRequest>(message: T): Promise<ReturnType<T>> {
		let response = null as ReturnType<T>;
		try {
			response = ((await browser.runtime.sendMessage(message)) ?? null) as ReturnType<T>;
		} catch (err) {
			if (err instanceof Error) {
				try {
					const messagingError = JSON.parse(err.message) as MessagingError;
					switch (messagingError.instance) {
						case 'Error':
							throw new Error(messagingError.data.message);

						case 'RequestError':
							throw new RequestError(messagingError.data);
					}
				} catch (_) {
					throw err;
				}
			}
		}
		return response;
	}

	/**
	 * Sends a message to a specific content page (for example, the page that is currently scrobbling).
	 */
	async toContent<T extends MessageRequest>(message: T, tabId: number): Promise<ReturnType<T>> {
		const response = ((await browser.tabs.sendMessage(tabId, message)) ?? null) as ReturnType<T>;
		return response;
	}

	/**
	 * Sends a message to all content pages.
	 */
	async toAllContent<T extends Exclude<MessageRequest, SendToAllContentMessage>>(
		message: T
	): Promise<void> {
		if (Shared.pageType !== 'background') {
			return this.toExtension({
				action: 'send-to-all-content',
				message,
			});
		}

		for (const tabId of this.ports.keys()) {
			await this.toContent(message, tabId);
		}
	}
}

export const Messaging = new _Messaging();
