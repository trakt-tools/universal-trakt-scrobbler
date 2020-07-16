import { TraktScrobble } from '../api/TraktScrobble';
import { BrowserStorage } from './BrowserStorage';
import { EventDispatcher, Events, ScrobbleEventData } from './Events';
import { Messaging } from './Messaging';
import { RequestException } from './Requests';

class _Notifications {
	messageNames: Record<number, string>;

	constructor() {
		this.messageNames = {
			[TraktScrobble.START]: 'scrobbleStarted',
			[TraktScrobble.PAUSE]: 'scrobblePaused',
			[TraktScrobble.STOP]: 'scrobbleStoped',
		};
	}

	startListeners = () => {
		EventDispatcher.subscribe(Events.SCROBBLE_SUCCESS, null, this.onScrobbleSuccess);
		EventDispatcher.subscribe(Events.SCROBBLE_ERROR, null, this.onScrobbleError);
	};

	onScrobbleSuccess = async (data: ScrobbleEventData): Promise<void> => {
		await this.onScrobble(data, true);
	};

	onScrobbleError = async (data: ScrobbleEventData): Promise<void> => {
		await this.onScrobble(data, false);
	};

	onScrobble = async (data: ScrobbleEventData, isSuccess: boolean): Promise<void> => {
		if (!data.item?.title) {
			return;
		}
		let title = '';
		let message = '';
		if (isSuccess) {
			title = data.item.title;
			message = browser.i18n.getMessage(this.messageNames[data.scrobbleType]);
		} else {
			title = await this.getTitleFromException(data.error);
			message = `${browser.i18n.getMessage('couldNotScrobble')} ${data.item.title}`;
		}
		await this.show(title, message);
	};

	getTitleFromException = async (err: RequestException): Promise<string> => {
		let title = '';
		if (err) {
			if (err.status === 404) {
				title = browser.i18n.getMessage('errorNotificationNotFound');
			} else if (err.status === 0) {
				const { auth } = await BrowserStorage.get('auth');
				if (auth?.access_token) {
					title = browser.i18n.getMessage('errorNotificationServers');
				} else {
					title = browser.i18n.getMessage('errorNotificationLogin');
				}
			} else {
				title = browser.i18n.getMessage('errorNotificationServers');
			}
		} else {
			title = browser.i18n.getMessage('errorNotification');
		}
		return title;
	};

	show = async (title: string, message: string): Promise<void> => {
		await Messaging.toBackground({ action: 'show-notification', title, message });
	};
}

const Notifications = new _Notifications();

export { Notifications };
