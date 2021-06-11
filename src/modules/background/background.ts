import { TraktAuth } from '../../api/TraktAuth';
import { TraktScrobble } from '../../api/TraktScrobble';
import { WrongItemApi } from '../../api/WrongItemApi';
import { BrowserAction } from '../../common/BrowserAction';
import {
	BrowserStorage,
	StorageValuesOptions,
	StreamingServiceValue,
} from '../../common/BrowserStorage';
import { Cache } from '../../common/Cache';
import { Errors } from '../../common/Errors';
import { I18N } from '../../common/I18N';
import { Messaging } from '../../common/Messaging';
import { Notifications } from '../../common/Notifications';
import { Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { Tabs } from '../../common/Tabs';
import { Item, SavedItem } from '../../models/Item';
import { TraktItem } from '../../models/TraktItem';
import { AutoSync } from '../../streaming-services/common/AutoSync';
import { StreamingServiceId, streamingServices } from '../../streaming-services/streaming-services';

const injectedTabs = new Set();
let streamingServiceEntries: [StreamingServiceId, StreamingServiceValue][] = [];
let streamingServiceScripts: browser.runtime.Manifest['content_scripts'] | null = null;
let isCheckingAutoSync = false;
let autoSyncCheckTimeout: number | null = null;
let scrobblingItem: SavedItem | null = null;
let scrobblingTabId: number | null = null;
let isScrobblingItemPaused = false;

const init = async () => {
	Shared.pageType = 'background';
	await BrowserStorage.init();
	if (BrowserStorage.options.allowRollbar) {
		Errors.startRollbar();
	}
	if (BrowserStorage.options.showNotifications) {
		Notifications.startListeners();
	}
	browser.storage.onChanged.addListener(onStorageChanged);
	streamingServiceEntries = Object.entries(BrowserStorage.options.streamingServices) as [
		StreamingServiceId,
		StreamingServiceValue
	][];
	const scrobblerEnabled = streamingServiceEntries.some(
		([streamingServiceId, value]) =>
			streamingServices[streamingServiceId].hasScrobbler && value.scrobble
	);
	if (scrobblerEnabled) {
		addTabListener(BrowserStorage.options);
	}
	void checkAutoSync();
	if (BrowserStorage.options.grantCookies) {
		addWebRequestListener();
	}
	Messaging.startListeners();
	await stopScrobblingItem();
};

const checkAutoSync = async () => {
	if (isCheckingAutoSync) {
		return;
	}
	isCheckingAutoSync = true;

	if (autoSyncCheckTimeout !== null) {
		window.clearTimeout(autoSyncCheckTimeout);
	}

	const now = Math.trunc(Date.now() / 1e3);
	const servicesToSync = streamingServiceEntries.filter(
		([streamingServiceId, value]) =>
			streamingServices[streamingServiceId].hasSync &&
			streamingServices[streamingServiceId].hasAutoSync &&
			value.sync &&
			value.autoSync &&
			value.autoSyncDays > 0 &&
			value.lastSync > 0 &&
			now - value.lastSync >= value.autoSyncDays * 86400
	);
	if (servicesToSync.length > 0) {
		try {
			await BrowserAction.setRotatingIcon();
			await BrowserAction.setTitle(I18N.translate('autoSyncing'));
			await AutoSync.sync(servicesToSync, now);
		} catch (err) {
			Errors.error('Failed to automatically sync history.', err);
		}
		await BrowserAction.setTitle();
		await BrowserAction.setStaticIcon();
	}

	// Check again every hour
	autoSyncCheckTimeout = window.setTimeout(() => void checkAutoSync(), 3600000);

	isCheckingAutoSync = false;
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
		streamingServiceEntries = Object.entries(newValue.streamingServices) as [
			StreamingServiceId,
			StreamingServiceValue
		][];

		const scrobblerEnabled = streamingServiceEntries.some(
			([streamingServiceId, value]) =>
				streamingServices[streamingServiceId].hasScrobbler && value.scrobble
		);
		if (scrobblerEnabled) {
			addTabListener(newValue);
		} else {
			removeTabListener();
		}
	}
	if (newValue.grantCookies) {
		addWebRequestListener();
	} else {
		removeWebRequestListener();
	}
};

const addTabListener = (options: StorageValuesOptions) => {
	streamingServiceScripts = Object.values(streamingServices)
		.filter((service) => service.hasScrobbler && options.streamingServices[service.id].scrobble)
		.map((service) => ({
			matches: service.hostPatterns.map((hostPattern) =>
				hostPattern.replace(/^\*:\/\/\*\./, 'https?:\\/\\/([^/]*\\.)?').replace(/\/\*$/, '')
			),
			js: ['js/lib/browser-polyfill.js', `js/${service.id}.js`],
			run_at: 'document_idle',
		}));
	if (!browser.tabs.onUpdated.hasListener(onTabUpdated)) {
		browser.tabs.onUpdated.addListener(onTabUpdated);
	}
};

const removeTabListener = () => {
	if (browser.tabs.onUpdated.hasListener(onTabUpdated)) {
		browser.tabs.onUpdated.removeListener(onTabUpdated);
	}
};

const onTabUpdated = (_: unknown, __: unknown, tab: browser.tabs.Tab) => {
	void injectScript(tab);
};

const injectScript = async (tab: Partial<browser.tabs.Tab>) => {
	if (
		!streamingServiceScripts ||
		tab.status !== 'complete' ||
		!tab.id ||
		!tab.url ||
		!tab.url.startsWith('http') ||
		tab.url.endsWith('#noinject') ||
		injectedTabs.has(tab.id)
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

Messaging.messageHandlers = {
	'open-tab': (message) => Tabs.open(message.url, message.extraProperties),

	'get-tab-id': (message, tabId) => tabId,

	'check-login': () => TraktAuth.validateToken(),

	'finish-login': (message) => TraktAuth.finishManualAuth(message.redirectUrl),

	login: () => TraktAuth.authorize(),

	logout: () => TraktAuth.revokeToken(),

	'get-cache': (message) => Cache.getValue(message.key),

	'set-cache': (message) => Cache.setValue(message.key, message.value),

	'send-request': (message, tabId) => Requests.send(message.request, tabId),

	'set-title': (message) => BrowserAction.setTitle(message.title),

	'set-active-icon': () => BrowserAction.setActiveIcon(),

	'set-inactive-icon': () => BrowserAction.setInactiveIcon(),

	'set-rotating-icon': () => BrowserAction.setRotatingIcon(),

	'set-static-icon': () => BrowserAction.setStaticIcon(),

	'start-scrobble': async (message, tabId) => {
		scrobblingItem = message.item;
		scrobblingTabId = tabId;
		isScrobblingItemPaused = false;
		await BrowserStorage.set({ scrobblingItem }, false);
	},

	'pause-scrobble': () => {
		isScrobblingItemPaused = true;
	},

	'stop-scrobble': async () => {
		scrobblingItem = null;
		scrobblingTabId = null;
		isScrobblingItemPaused = false;
		await BrowserStorage.remove('scrobblingItem');
	},

	'update-scrobbling-item': async (message) => {
		scrobblingItem = message.item;
		await BrowserStorage.set({ scrobblingItem }, false);
	},

	'get-scrobbling-info': () => ({
		item: scrobblingItem,
		tabId: scrobblingTabId,
		isPaused: isScrobblingItemPaused,
	}),

	'show-notification': (message) => Notifications.show(message.title, message.message),

	'save-correction-suggestion': (message) => {
		const item = Item.load(message.item);
		return WrongItemApi.saveSuggestion(item, message.url);
	},

	'check-auto-sync': () => checkAutoSync(),
};

Messaging.onPortDisconnected = async (port, tabId) => {
	if (injectedTabs.has(tabId)) {
		injectedTabs.delete(tabId);
	}
	if (tabId === scrobblingTabId) {
		await stopScrobblingItem();
	}
};

const stopScrobblingItem = async () => {
	scrobblingItem = (await BrowserStorage.get('scrobblingItem')).scrobblingItem ?? null;
	if (!scrobblingItem) {
		return;
	}
	if (scrobblingItem.trakt) {
		await TraktScrobble.stop(TraktItem.load(scrobblingItem.trakt));
	}
	await BrowserStorage.remove('scrobblingItem');
	await BrowserAction.setInactiveIcon();
	scrobblingItem = null;
	scrobblingTabId = null;
	isScrobblingItemPaused = false;
};

void init();
