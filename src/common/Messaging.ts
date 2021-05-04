import { Item } from '../models/Item';
import { GetCacheMessage, GetTabIdMessage, MessageRequest } from '../modules/background/background';
import { CacheValues } from './Cache';
import { Errors } from './Errors';
import { EventDispatcher } from './Events';

export type ReturnTypes<T extends MessageRequest> = T extends GetTabIdMessage
	? { tabId: number | undefined }
	: T extends GetCacheMessage
	? CacheValues[keyof CacheValues]
	: Record<string, unknown>;

class _Messaging {
	startListeners = () => {
		browser.runtime.onMessage.addListener(
			(this.onMessage as unknown) as browser.runtime.onMessageEvent
		);
	};

	onMessage = (request: string, sender: browser.runtime.MessageSender): Promise<string> => {
		let executingAction: Promise<unknown>;
		const parsedRequest = JSON.parse(request) as MessageRequest;
		switch (parsedRequest.action) {
			case 'wrong-item-corrected': {
				executingAction = EventDispatcher.dispatch('WRONG_ITEM_CORRECTED', null, {
					item: new Item(parsedRequest.item),
					type: parsedRequest.type,
					traktId: parsedRequest.traktId,
					url: parsedRequest.url,
				});
				break;
			}
		}
		return new Promise((resolve) => {
			executingAction
				.then((response) => {
					resolve(JSON.stringify(response || null));
				})
				.catch((err: Error) => {
					Errors.log('Failed to execute action.', err);
					resolve(
						JSON.stringify({
							error: err.message ? { message: err.message } : err,
						})
					);
				});
		});
	};

	toBackground = async <T extends MessageRequest>(message: T): Promise<ReturnTypes<T>> => {
		const response: string = await browser.runtime.sendMessage(JSON.stringify(message));
		return JSON.parse(response) as ReturnTypes<T>;
	};

	toContent = async (message: MessageRequest, tabId: number): Promise<void> => {
		return browser.tabs.sendMessage(tabId, JSON.stringify(message));
	};
}

export const Messaging = new _Messaging();
