import { EventDispatcher } from './Events';
import { Messaging } from './Messaging';
import { Shared } from './Shared';

class _BrowserAction {
	startListeners = () => {
		EventDispatcher.subscribe('SCROBBLE_ACTIVE', null, this.setActiveIcon);
		EventDispatcher.subscribe('SCROBBLE_INACTIVE', null, this.setInactiveIcon);
	};

	setActiveIcon = async (): Promise<void> => {
		if (Shared.pageType === 'background') {
			await browser.browserAction.setIcon({
				path: browser.runtime.getURL('images/uts-icon-selected-38.png'),
			});
		} else {
			await Messaging.toBackground({ action: 'set-active-icon' });
		}
	};

	setInactiveIcon = async (): Promise<void> => {
		if (Shared.pageType === 'background') {
			await browser.browserAction.setIcon({
				path: browser.runtime.getURL('images/uts-icon-38.png'),
			});
		} else {
			await Messaging.toBackground({ action: 'set-inactive-icon' });
		}
	};
}

export const BrowserAction = new _BrowserAction();
