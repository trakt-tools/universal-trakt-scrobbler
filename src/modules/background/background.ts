import { TraktAuth, TraktAuthDetails } from '../../api/TraktAuth';
import { TraktScrobble } from '../../api/TraktScrobble';
import { WrongItemApi } from '../../api/WrongItemApi';
import { BrowserAction } from '../../common/BrowserAction';
import { BrowserStorage, StorageValuesOptions } from '../../common/BrowserStorage';
import { Cache, CacheValues } from '../../common/Cache';
import { Errors } from '../../common/Errors';
import { RequestDetails, Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { TabProperties, Tabs } from '../../common/Tabs';
import { Item } from '../../models/Item';
import { TraktItem } from '../../models/TraktItem';
import { StreamingServiceId, streamingServices } from '../../streaming-services/streaming-services';

export type MessageRequest =
	| OpenTabMessage
	| GetTabIdMessage
	| CheckLoginMessage
	| FinishLoginMessage
	| LoginMessage
	| LogoutMessage
	| GetCacheMessage
	| SetCacheMessage<keyof CacheValues>
	| SetActiveIconMessage
	| SetInactiveIconMessage
	| SetRotatingIconMessage
	| SetStaticIconMessage
	| CheckScrobbleMessage
	| StartScrobbleMessage
	| StopScrobbleMessage
	| SendRequestMessage
	| ShowNotificationMessage
	| WrongItemCorrectedMessage
	| SaveCorrectionSuggestionMessage;

export interface ReturnTypes {
	'open-tab': browser.tabs.Tab;
	'get-tab-id': {
		tabId?: number;
	};
	'check-login': TraktAuthDetails;
	'finish-login': null;
	login: TraktAuthDetails;
	logout: null;
	'get-cache': CacheValues[keyof CacheValues];
	'set-cache': null;
	'set-active-icon': null;
	'set-inactive-icon': null;
	'set-rotating-icon': null;
	'set-static-icon': null;
	'check-scrobble': null;
	'start-scrobble': null;
	'stop-scrobble': null;
	'send-request': string;
	'show-notification': string;
	'wrong-item-corrected': null;
	'save-correction-suggestion': null;
}

export interface ErrorReturnType {
	error: {
		message: string;
	};
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

export interface CheckScrobbleMessage {
	action: 'check-scrobble';
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

export interface NavigationCommittedParams {
	transitionType: browser.webNavigation.TransitionType;
	tabId: number;
	url: string;
}

const injectedTabs = new Set();
let streamingServiceScripts: browser.runtime.Manifest['content_scripts'] | null = null;

const init = async () => {
	Shared.pageType = 'background';
	await BrowserStorage.sync();
	const storage = await BrowserStorage.get('options');
	if (storage.options?.allowRollbar) {
		Errors.startRollbar();
	}
	browser.tabs.onRemoved.addListener((tabId) => void onTabRemoved(tabId));
	browser.storage.onChanged.addListener(onStorageChanged);
	if (storage.options?.streamingServices) {
		const scrobblerEnabled = (Object.entries(storage.options.streamingServices) as [
			StreamingServiceId,
			boolean
		][]).some(
			([streamingServiceId, value]) => value && streamingServices[streamingServiceId].hasScrobbler
		);
		if (scrobblerEnabled) {
			addWebNavigationListener(storage.options);
		}
	}
	if (storage.options?.grantCookies) {
		addWebRequestListener();
	}
	browser.runtime.onMessage.addListener((onMessage as unknown) as browser.runtime.onMessageEvent);
};

const onTabUpdated = (_: unknown, __: unknown, tab: browser.tabs.Tab) => {
	void injectScript(tab);
};

/**
 * Checks if the tab that was closed was the tab that was scrobbling and, if that's the case, stops the scrobble.
 */
const onTabRemoved = async (tabId: number) => {
	try {
		/**
		 * Some single-page apps trigger the onTabRemoved event when navigating through pages,
		 * so we double check here to make sure that the tab was actually removed.
		 * If the tab was removed, this will throw an error.
		 */
		await browser.tabs.get(tabId);
		return;
	} catch (err) {
		// Do nothing
	}
	if (injectedTabs.has(tabId)) {
		injectedTabs.delete(tabId);
	}
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

const injectScript = async (tab: Partial<browser.tabs.Tab>, reload = false) => {
	if (
		!streamingServiceScripts ||
		tab.status !== 'complete' ||
		!tab.id ||
		!tab.url ||
		!tab.url.startsWith('http') ||
		(injectedTabs.has(tab.id) && !reload)
	) {
		return;
	}
	for (const { matches, js, run_at: runAt } of streamingServiceScripts) {
		if (!js || !runAt) {
			continue;
		}
		const isMatch = matches.find((match) => tab.url?.match(match));
		if (isMatch) {
			injectedTabs.add(tab.id);
			for (const file of js) {
				await browser.tabs.executeScript(tab.id, { file, runAt });
			}
			break;
		}
	}
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
	const newValue = changes.options.newValue as StorageValuesOptions | undefined;
	if (!newValue) {
		return;
	}
	if (newValue.streamingServices) {
		const scrobblerEnabled = (Object.entries(newValue.streamingServices) as [
			StreamingServiceId,
			boolean
		][]).some(
			([streamingServiceId, value]) => value && streamingServices[streamingServiceId].hasScrobbler
		);
		if (scrobblerEnabled) {
			addWebNavigationListener(newValue);
		} else {
			removeWebNavigationListener();
		}
	}
	if (newValue.grantCookies) {
		addWebRequestListener();
	} else {
		removeWebRequestListener();
	}
};

const addWebNavigationListener = (options: StorageValuesOptions) => {
	streamingServiceScripts = Object.values(streamingServices)
		.filter((service) => options.streamingServices[service.id] && service.hasScrobbler)
		.map((service) => ({
			matches: service.hostPatterns.map((hostPattern) =>
				hostPattern.replace(/^\*:\/\/\*\./, 'https?://(www.)?').replace(/\/\*$/, '')
			),
			js: ['js/lib/browser-polyfill.js', `js/${service.id}.js`],
			run_at: 'document_idle',
		}));
	if (!browser.tabs.onUpdated.hasListener(onTabUpdated)) {
		browser.tabs.onUpdated.addListener(onTabUpdated);
	}
	if (
		!browser.webNavigation ||
		browser.webNavigation.onCommitted.hasListener(onNavigationCommitted)
	) {
		return;
	}
	browser.webNavigation.onCommitted.addListener(onNavigationCommitted);
};

const removeWebNavigationListener = () => {
	if (browser.tabs.onUpdated.hasListener(onTabUpdated)) {
		browser.tabs.onUpdated.removeListener(onTabUpdated);
	}
	if (
		!browser.webNavigation ||
		!browser.webNavigation.onCommitted.hasListener(onNavigationCommitted)
	) {
		return;
	}
	browser.webNavigation.onCommitted.removeListener(onNavigationCommitted);
};

const onNavigationCommitted = ({ transitionType, tabId, url }: NavigationCommittedParams) => {
	if (transitionType !== 'reload') {
		return;
	}
	void injectScript(
		{
			status: 'complete',
			id: tabId,
			url: url,
		},
		true
	);
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
		case 'open-tab': {
			executingAction = Tabs.open(parsedRequest.url, parsedRequest.extraProperties);
			break;
		}
		case 'get-tab-id': {
			executingAction = Promise.resolve({ tabId: sender.tab?.id });
			break;
		}
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
			setCacheMessage(parsedRequest);
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
		case 'set-rotating-icon': {
			executingAction = BrowserAction.setRotatingIcon();
			break;
		}
		case 'set-static-icon': {
			executingAction = BrowserAction.setStaticIcon();
			break;
		}
		case 'check-scrobble': {
			if (sender.tab?.id) {
				executingAction = onTabRemoved(sender.tab.id);
			} else {
				executingAction = Promise.resolve();
			}
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
						error: { message: err.message },
					})
				);
			});
	});
};

const setCacheMessage = <K extends keyof CacheValues>(message: SetCacheMessage<K>) => {
	Cache.values[message.key] = message.value;
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
