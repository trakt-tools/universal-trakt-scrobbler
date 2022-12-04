import { TraktAuth } from '@apis/TraktAuth';
import { AutoSync } from '@common/AutoSync';
import { BrowserAction } from '@common/BrowserAction';
import { BrowserStorage } from '@common/BrowserStorage';
import { Cache } from '@common/Cache';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { Notifications } from '@common/Notifications';
import { Requests } from '@common/Requests';
import { RequestsManager } from '@common/RequestsManager';
import { ScriptInjector } from '@common/ScriptInjector';
import { Shared } from '@common/Shared';
import { Tabs } from '@common/Tabs';
import '@images/uts-icon-128.png';
import '@images/uts-icon-16.png';
import '@images/uts-icon-19.png';
import '@images/uts-icon-38.png';
import '@images/uts-icon-selected-19.png';
import '@images/uts-icon-selected-38.png';

Cache.addBackgroundListeners();
AutoSync.addBackgroundListeners();

const init = async () => {
	Shared.pageType = 'background';
	await BrowserStorage.init();
	BrowserAction.init();
	Errors.init();
	EventDispatcher.init();
	Notifications.init();
	RequestsManager.init();
	ScriptInjector.init();
	await Cache.initFromBackground();
	await AutoSync.initFromBackground();
	Messaging.init();
	Shared.finishInit();
};

Messaging.addHandlers({
	'open-tab': (message) => Tabs.open(message.url, message.extraProperties),

	'get-tab-id': (message, tabId) => tabId,

	'validate-trakt-token': () => TraktAuth.validateToken(),

	'finish-login': (message) => TraktAuth.finishManualAuth(message.redirectUrl),

	login: () => TraktAuth.authorize(),

	logout: () => TraktAuth.revokeToken(),

	'send-request': (message, tabId) => Requests.send(message.request, tabId),

	'set-title': (message) => BrowserAction.setTitle(message.title),

	'set-active-icon': () => BrowserAction.setActiveIcon(),

	'set-inactive-icon': () => BrowserAction.setInactiveIcon(),

	'set-rotating-icon': () => BrowserAction.setRotatingIcon(),

	'set-static-icon': () => BrowserAction.setStaticIcon(),

	'show-notification': (message) => Notifications.show(message.title, message.message),

	'send-to-all-content': (message) => Messaging.toAllContent(message.message),
});

void init();
