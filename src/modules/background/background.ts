import { TraktAuth } from '../../api/TraktAuth';
import { BrowserStorage, StorageValuesOptions } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { RequestDetails, Requests } from '../../services/Requests';
import { Shared } from '../../services/Shared';
import { Tabs } from '../../services/Tabs';

interface MessageRequest {
	action: 'check-login' | 'finish-login' | 'login' | 'logout' | 'send-request';
	url: string;
	redirectUrl: string;
	request: RequestDetails;
}

const init = async () => {
	Shared.isBackgroundPage = true;
	await BrowserStorage.sync();
	const storage = await BrowserStorage.get('options');
	if (storage.options?.allowRollbar) {
		Errors.startRollbar();
	}
	browser.storage.onChanged.addListener(onStorageChanged);
	browser.browserAction.onClicked.addListener(() => void onBrowserActionClicked());
	if (storage.options?.grantCookies) {
		addWebRequestListener();
	}
	browser.runtime.onMessage.addListener((onMessage as unknown) as browser.runtime.onMessageEvent);
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

const onBrowserActionClicked = async (): Promise<void> => {
	const tabs = await browser.tabs.query({
		url: `${browser.runtime.getURL('/')}*`,
	});
	if (tabs.length > 0) {
		await browser.tabs.update(tabs[0].id, { active: true });
	} else {
		await Tabs.open(browser.runtime.getURL('html/history.html'));
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
		urls: ['*://*.trakt.tv/*', '*://*.netflix.com/*', '*://tv.nrk.no/*', '*://*.viaplay.no/*'],
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

void init();
