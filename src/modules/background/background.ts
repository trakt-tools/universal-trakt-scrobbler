import { TraktAuth } from '../../api/TraktAuth';
import { TraktScrobble } from '../../api/TraktScrobble';
import { WrongItemApi } from '../../api/WrongItemApi';
import { BrowserAction } from '../../common/BrowserAction';
import { BrowserStorage, StorageValuesOptions } from '../../common/BrowserStorage';
import { Cache, CacheValues } from '../../common/Cache';
import { Errors } from '../../common/Errors';
import { RequestDetails, Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { Item } from '../../models/Item';
import { TraktItem } from '../../models/TraktItem';
import { StreamingServiceId, streamingServices } from '../../streaming-services/streaming-services';

export type MessageRequest =
	| CheckLoginMessage
	| FinishLoginMessage
	| LoginMessage
	| LogoutMessage
	| GetCacheMessage
	| SetCacheMessage<keyof CacheValues>
	| SetActiveIconMessage
	| SetInactiveIconMessage
	| StartScrobbleMessage
	| StopScrobbleMessage
	| SendRequestMessage
	| ShowNotificationMessage
	| WrongItemCorrectedMessage
	| SaveCorrectionSuggestionMessage;

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

export interface GetCacheMessage {
	action: 'get-cache';
	key: keyof CacheValues;
}

export interface SetCacheMessage<K extends keyof CacheValues> {
	action: 'set-cache';
	key: K;
	value: CacheValues[K];
}

export interface SendRequestMessage {
	action: 'send-request';
	request: RequestDetails;
}

export interface SetActiveIconMessage {
	action: 'set-active-icon';
}

export interface SetInactiveIconMessage {
	action: 'set-inactive-icon';
}

export interface ShowNotificationMessage {
	action: 'show-notification';
	title: string;
	message: string;
}

export interface StartScrobbleMessage {
	action: 'start-scrobble';
}

export interface StopScrobbleMessage {
	action: 'stop-scrobble';
}

export interface WrongItemCorrectedMessage {
	action: 'wrong-item-corrected';
	item: Item;
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
}

export interface SaveCorrectionSuggestionMessage {
	action: 'save-correction-suggestion';
	serviceId: StreamingServiceId;
	item: Item;
	url: string;
}

const init = async () => {
	Shared.pageType = 'background';
	await BrowserStorage.sync();
	const storage = await BrowserStorage.get('options');
	if (storage.options?.allowRollbar) {
		Errors.startRollbar();
	}
	browser.tabs.onRemoved.addListener((tabId) => void onTabRemoved(tabId));
	browser.storage.onChanged.addListener(onStorageChanged);
	if (storage.options?.grantCookies) {
		addWebRequestListener();
	}
	browser.runtime.onMessage.addListener((onMessage as unknown) as browser.runtime.onMessageEvent);
};

/**
 * Checks if the tab that was closed was the tab that was scrobbling and, if that's the case, stops the scrobble.
 */
const onTabRemoved = async (tabId: number) => {
	const { scrobblingTabId } = await BrowserStorage.get('scrobblingTabId');
	if (tabId !== scrobblingTabId) {
		return;
	}
	const { scrobblingItem } = await BrowserStorage.get('scrobblingItem');
	if (scrobblingItem) {
		await TraktScrobble.stop(new TraktItem(scrobblingItem.trakt));
		await BrowserStorage.remove('scrobblingItem');
	}
	await BrowserStorage.remove('scrobblingTabId');
	await BrowserAction.setInactiveIcon();
};

const onStorageChanged = (
	changes: browser.storage.ChangeDict,
	areaName: browser.storage.StorageName
) => {
	if (areaName !== 'local') {
		return;
	}
	if (!changes.options) {
		return;
	}
	if ((changes.options.newValue as StorageValuesOptions)?.grantCookies) {
		addWebRequestListener();
	} else {
		removeWebRequestListener();
	}
};

const addWebRequestListener = () => {
	if (
		!browser.webRequest ||
		browser.webRequest.onBeforeSendHeaders.hasListener(onBeforeSendHeaders)
	) {
		return;
	}
	const filters: browser.webRequest.RequestFilter = {
		types: ['xmlhttprequest'],
		urls: [
			'*://*.trakt.tv/*',
			...Object.values(streamingServices)
				.map((service) => service.hostPatterns)
				.flat(),
		],
	};
	void browser.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, filters, [
		'blocking',
		'requestHeaders',
	]);
};

const removeWebRequestListener = () => {
	if (
		!browser.webRequest ||
		!browser.webRequest.onBeforeSendHeaders.hasListener(onBeforeSendHeaders)
	) {
		return;
	}
	browser.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);
};

/**
 * Makes sure cookies are set for requests.
 */
const onBeforeSendHeaders = ({ requestHeaders }: browser.webRequest.BlockingResponse) => {
	if (!requestHeaders) {
		return;
	}
	const utsCookies = requestHeaders.find((header) => header.name.toLowerCase() === 'uts-cookie');
	if (!utsCookies) {
		return;
	}
	requestHeaders = requestHeaders.filter((header) => header.name.toLowerCase() !== 'cookie');
	utsCookies.name = 'Cookie';
	return {
		requestHeaders: requestHeaders,
	};
};

const onMessage = (request: string, sender: browser.runtime.MessageSender): Promise<string> => {
	let executingAction: Promise<unknown>;
	const parsedRequest = JSON.parse(request) as MessageRequest;
	switch (parsedRequest.action) {
		case 'check-login': {
			executingAction = TraktAuth.validateToken();
			break;
		}
		case 'finish-login': {
			executingAction = TraktAuth.finishManualAuth(parsedRequest.redirectUrl);
			break;
		}
		case 'login': {
			executingAction = TraktAuth.authorize();
			break;
		}
		case 'logout': {
			executingAction = TraktAuth.revokeToken();
			break;
		}
		case 'get-cache': {
			executingAction = Promise.resolve(Cache.values[parsedRequest.key]);
			break;
		}
		case 'set-cache': {
			Cache.values[parsedRequest.key] = parsedRequest.value;
			executingAction = Promise.resolve();
			break;
		}
		case 'send-request': {
			executingAction = Requests.send(parsedRequest.request, sender.tab?.id);
			break;
		}
		case 'set-active-icon': {
			executingAction = BrowserAction.setActiveIcon();
			break;
		}
		case 'set-inactive-icon': {
			executingAction = BrowserAction.setInactiveIcon();
			break;
		}
		case 'start-scrobble': {
			executingAction = setScrobblingTabId(sender.tab?.id);
			break;
		}
		case 'stop-scrobble': {
			executingAction = removeScrobblingTabId();
			break;
		}
		case 'show-notification': {
			executingAction = browser.permissions
				.contains({ permissions: ['notifications'] })
				.then((hasPermissions) => {
					if (hasPermissions) {
						return browser.notifications.create({
							type: 'basic',
							iconUrl: 'images/uts-icon-128.png',
							title: parsedRequest.title,
							message: parsedRequest.message,
						});
					}
				});
			break;
		}
		case 'save-correction-suggestion': {
			const item = new Item(parsedRequest.item);
			executingAction = WrongItemApi.saveSuggestion(
				parsedRequest.serviceId,
				item,
				parsedRequest.url
			);
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

const setScrobblingTabId = async (tabId?: number): Promise<void> => {
	const { scrobblingItem, scrobblingTabId } = await BrowserStorage.get([
		'scrobblingItem',
		'scrobblingTabId',
	]);
	if (scrobblingItem && tabId !== scrobblingTabId) {
		// Stop the previous scrobble if it exists.
		await TraktScrobble.stop(new TraktItem(scrobblingItem.trakt));
		await BrowserStorage.remove('scrobblingItem');
	}
	await BrowserStorage.set({ scrobblingTabId: tabId }, false);
};

const removeScrobblingTabId = (): Promise<void> => {
	return BrowserStorage.remove('scrobblingTabId');
};

void init();
