import { BrowserAction } from '../../../services/BrowserAction';
import { BrowserStorage } from '../../../services/BrowserStorage';
import { Errors } from '../../../services/Errors';
import { Notifications } from '../../../services/Notifications';
import { NetflixEvents } from '../../../streaming-services/netflix/NetflixEvents';
import { Shared } from '../../../services/Shared';
import { getScrobbleController } from '../../../streaming-services/common/common';

const init = async () => {
	Shared.isBackgroundPage = false;
	await BrowserStorage.sync();
	const values = await BrowserStorage.get('options');
	if (values.options) {
		if (values.options.allowRollbar) {
			Errors.startRollbar();
			Errors.startListeners();
		}
		if (values.options.showNotifications) {
			Notifications.startListeners();
		}
	}
	BrowserAction.startListeners();
	getScrobbleController('netflix').startListeners();
	NetflixEvents.startListeners();
};

void init();
