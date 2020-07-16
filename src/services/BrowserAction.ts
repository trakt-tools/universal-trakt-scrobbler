import { EventDispatcher, Events } from './Events';
import { Messaging } from './Messaging';

class _BrowserAction {
	startListeners = () => {
		EventDispatcher.subscribe(Events.SCROBBLE_ACTIVE, null, this.setActiveIcon);
		EventDispatcher.subscribe(Events.SCROBBLE_INACTIVE, null, this.setInactiveIcon);
	};

	setActiveIcon = async (): Promise<void> => {
		await Messaging.toBackground({ action: 'set-active-icon' });
	};

	setInactiveIcon = async (): Promise<void> => {
		await Messaging.toBackground({ action: 'set-inactive-icon' });
	};
}

export const BrowserAction = new _BrowserAction();
