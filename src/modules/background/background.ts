import { TraktAuth } from '../../api/TraktAuth';
import { BrowserStorage } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { Requests, RequestDetails } from '../../services/Requests';
import { Shared } from '../../services/Shared';

interface MessageRequest {
	action: 'check-login' | 'create-tab' | 'finish-login' | 'login' | 'logout' | 'send-request';
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
	browser.browserAction.onClicked.addListener(() => void onBrowserActionClicked());
	browser.runtime.onMessage.addListener((onMessage as unknown) as browser.runtime.onMessageEvent);
};

const onBrowserActionClicked = async (): Promise<void> => {
	const tabs = await browser.tabs.query({
		url: `${browser.runtime.getURL('')}*`,
	});
	if (tabs && tabs.length > 0) {
		await browser.tabs.update(tabs[0].id, { active: true });
	} else {
		await browser.tabs.create({
			url: browser.runtime.getURL('html/history.html'),
			active: true,
		});
	}
};

const onMessage = (request: string, sender: browser.runtime.MessageSender): Promise<string> => {
	let executingAction: Promise<unknown>;
	const parsedRequest = JSON.parse(request) as MessageRequest;
	switch (parsedRequest.action) {
		case 'check-login': {
			executingAction = TraktAuth.validateToken();
			break;
		}
		case 'create-tab': {
			executingAction = browser.tabs.create({
				url: parsedRequest.url,
				active: true,
			});
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
			executingAction = Requests.send(parsedRequest.request);
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
