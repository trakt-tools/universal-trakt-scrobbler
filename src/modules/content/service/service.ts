import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { RequestsManager } from '@common/RequestsManager';
import { ScriptInjector } from '@common/ScriptInjector';
import { getScrobbleController } from '@common/ScrobbleController';
import { getScrobbleEvents } from '@common/ScrobbleEvents';
import { Shared } from '@common/Shared';

Shared.pageType = 'content';

Messaging.addListeners();

export const init = async (serviceId: string): Promise<void> => {
	await BrowserStorage.init();
	Errors.init();
	EventDispatcher.init();
	RequestsManager.init();
	ScriptInjector.init();
	getScrobbleController(serviceId).init();
	getScrobbleEvents(serviceId).init();
	Messaging.init();
};

Messaging.addHandlers({
	'inject-function': ({ serviceId, key, url, params }) =>
		ScriptInjector.inject(serviceId, key, url, params),
});
