import { BrowserAction } from '../../common/BrowserAction';
import { BrowserStorage } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { Notifications } from '../../common/Notifications';
import { Shared } from '../../common/Shared';
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
