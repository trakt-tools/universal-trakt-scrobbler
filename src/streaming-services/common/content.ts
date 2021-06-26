import { BrowserAction } from '../../common/BrowserAction';
import { BrowserStorage } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { Messaging } from '../../common/Messaging';
import { Notifications } from '../../common/Notifications';
import { ScriptInjector } from '../../common/ScriptInjector';
import { Shared } from '../../common/Shared';
import { Item } from '../../models/Item';
import { getScrobbleController } from './ScrobbleController';
import { getScrobbleEvents } from './ScrobbleEvents';

export const init = async (serviceId: string) => {
	Shared.pageType = 'content';
	await BrowserStorage.init();
	const { allowRollbar, showNotifications } = BrowserStorage.options;
	if (allowRollbar) {
		Errors.startRollbar();
		Errors.startListeners();
	}
	if (showNotifications) {
		Notifications.startListeners();
	}
	BrowserAction.startListeners();
	ScriptInjector.startListeners();
	getScrobbleController(serviceId).startListeners();
	getScrobbleEvents(serviceId).startListeners();
	Messaging.startListeners();
};

Messaging.messageHandlers = {
	'wrong-item-corrected': (message) => {
		return EventDispatcher.dispatch('WRONG_ITEM_CORRECTED', null, {
			item: Item.load(message.item),
			type: message.type,
			traktId: message.traktId,
			url: message.url,
		});
	},
};
