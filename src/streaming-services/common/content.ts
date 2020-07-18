import { BrowserAction } from '../../services/BrowserAction';
import { BrowserStorage } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { Notifications } from '../../services/Notifications';
import { Shared } from '../../services/Shared';
import { StreamingServiceId } from '../streaming-services';
import { getScrobbleController, getScrobbleEvents } from './common';

export const init = async (serviceId: StreamingServiceId) => {
	Shared.isBackgroundPage = false;
	await BrowserStorage.sync();
	const { options } = await BrowserStorage.get('options');
	if (options) {
		const { allowRollbar, showNotifications } = options;
		if (allowRollbar) {
			Errors.startRollbar();
			Errors.startListeners();
		}
		if (showNotifications) {
			Notifications.startListeners();
		}
	}
	BrowserAction.startListeners();
	getScrobbleController(serviceId).startListeners();
	getScrobbleEvents(serviceId).startListeners();
};
