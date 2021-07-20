import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { getScrobbleController } from '@common/ScrobbleController';
import { getScrobbleEvents } from '@common/ScrobbleEvents';
import { Shared } from '@common/Shared';
import { Item } from '@models/Item';

export const init = async (serviceId: string) => {
	Shared.pageType = 'content';
	await BrowserStorage.init();
	Errors.init();
	Requests.init();
	ScriptInjector.init();
	getScrobbleController(serviceId).init();
	getScrobbleEvents(serviceId).init();
	Messaging.init();
};

Messaging.messageHandlers = {
	'item-corrected': (message) => {
		return EventDispatcher.dispatch('ITEM_CORRECTED', null, {
			oldItem: Item.load(message.oldItem),
			newItem: Item.load(message.newItem),
		});
	},
};
