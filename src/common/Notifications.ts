import { TraktScrobble } from '../api/TraktScrobble';
import { BrowserStorage } from './BrowserStorage';
import { EventDispatcher, ScrobbleErrorData, ScrobbleSuccessData } from './Events';
import { I18N } from './I18N';
import { Messaging } from './Messaging';
import { RequestException } from './Requests';

class _Notifications {
	messageNames: Record<number, MessageName>;

	constructor() {
		this.messageNames = {
			[TraktScrobble.START]: 'scrobbleStarted',
			[TraktScrobble.PAUSE]: 'scrobblePaused',
			[TraktScrobble.STOP]: 'scrobbleStopped',
		};
	}

	startListeners = () => {
		EventDispatcher.subscribe('SCROBBLE_SUCCESS', null, this.onScrobble);
		EventDispatcher.subscribe('SCROBBLE_ERROR', null, this.onScrobble);
	};

	onScrobble = async (data: ScrobbleSuccessData | ScrobbleErrorData): Promise<void> => {
		if (!data.item?.title) {
			return;
		}
		let title = '';
		let message = '';
		if ('error' in data) {
			title = await this.getTitleFromException(data.error);
			message = `${I18N.translate('couldNotScrobble')} ${data.item.title}`;
		} else {
			title = data.item.title;
			message = I18N.translate(this.messageNames[data.scrobbleType]);
		}
		await this.show(title, message);
	};

	getTitleFromException = async (err: RequestException): Promise<string> => {
		let title = '';
		if (err) {
			if (err.status === 404) {
				title = I18N.translate('errorNotificationNotFound');
			} else if (err.status === 0) {
				const { auth } = await BrowserStorage.get('auth');
				if (auth?.access_token) {
					title = I18N.translate('errorNotificationServers');
				} else {
					title = I18N.translate('errorNotificationLogin');
				}
			} else {
				title = I18N.translate('errorNotificationServers');
			}
		} else {
			title = I18N.translate('errorNotification');
		}
		return title;
	};

	show = async (title: string, message: string): Promise<void> => {
		await Messaging.toBackground({ action: 'show-notification', title, message });
	};
}

const Notifications = new _Notifications();

export { Notifications };
