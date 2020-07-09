import { TraktAuth } from '../../api/TraktAuth';
import { BrowserStorage } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { Requests } from '../../services/Requests';
import { Shared } from '../../services/Shared';

init();

async function init() {
	Shared.isBackgroundPage = true;
	await BrowserStorage.sync();
	const values = await BrowserStorage.get('options');
	if (values.options && values.options.allowRollbar) {
		Errors.startRollbar();
	}
	browser.browserAction.onClicked.addListener(onBrowserActionClicked);
	browser.runtime.onMessage.addListener(
		/** @type {browser.runtime.onMessageEvent} */ (/** @type {unknown} */ (onMessage))
	);
}

/**
 * @returns {Promise<void>}
 */
async function onBrowserActionClicked() {
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
}

/**
 * @param {string} request
 * @returns {Promise<string>}
 */
function onMessage(request) {
	/** @type {Promise<unknown>} */
	let executingAction;
	const parsedRequest = JSON.parse(request);
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
			.catch((err) => {
				Errors.log('Failed to execute action.', err);
				resolve(
					JSON.stringify({
						error: err.message ? { message: err.message } : err,
					})
				);
			});
	});
}
