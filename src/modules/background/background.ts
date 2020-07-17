import { TraktAuth } from '../../api/TraktAuth';
import { TraktScrobble } from '../../api/TraktScrobble';
import { TraktItem } from '../../models/TraktItem';
import { BrowserAction } from '../../services/BrowserAction';
import { BrowserStorage, StorageValuesOptions } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { RequestDetails, Requests } from '../../services/Requests';
import { Shared } from '../../services/Shared';
import { streamingServices } from '../../streaming-services/streaming-services';

export type MessageRequest =
	| {
			action:
				| 'check-login'
				| 'login'
				| 'logout'
				| 'set-active-icon'
				| 'set-inactive-icon'
				| 'start-scrobble'
				| 'stop-scrobble';
	  }
	| FinishLoginMessage
	| SendRequestMessage
	| ShowNotificationMessage;

export interface FinishLoginMessage {
	action: 'finish-login';
	redirectUrl: string;
}

export interface SendRequestMessage {
	action: 'send-request';
	request: RequestDetails;
}

export interface ShowNotificationMessage {
	action: 'show-notification';
	title: string;
	message: string;
}

const init = async () => {
	Shared.isBackgroundPage = true;
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
		await TraktScrobble.stop(new TraktItem(scrobblingItem));
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
		await TraktScrobble.stop(new TraktItem(scrobblingItem));
		await BrowserStorage.remove('scrobblingItem');
	}
	await BrowserStorage.set({ scrobblingTabId: tabId }, false);
};

const removeScrobblingTabId = (): Promise<void> => {
	return BrowserStorage.remove('scrobblingTabId');
};

void init();
