import { TraktScrobble } from '@apis/TraktScrobble';
import { BrowserStorage } from '@common/BrowserStorage';
import {
	EventDispatcher,
	ScrobbleErrorData,
	ScrobbleSuccessData,
	SearchErrorData,
	StorageOptionsChangeData,
} from '@common/Events';
import { I18N } from '@common/I18N';
import { Messaging } from '@common/Messaging';
import { RequestException } from '@common/Requests';
import { Shared } from '@common/Shared';
import { browser } from 'webextension-polyfill-ts';

class _Notifications {
	messageNames: Record<number, MessageName>;
	private hasAddedListeners = false;

	constructor() {
		this.messageNames = {
			[TraktScrobble.START]: 'scrobbleStarted',
			[TraktScrobble.PAUSE]: 'scrobblePaused',
			[TraktScrobble.STOP]: 'scrobbleStopped',
		};
	}

	init() {
		this.checkListeners();
		EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
	}

	private onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		if (data.options && 'showNotifications' in data.options) {
			this.checkListeners();
		}
	};

	checkListeners() {
		const { showNotifications } = BrowserStorage.options;
		if (showNotifications && !this.hasAddedListeners) {
			EventDispatcher.subscribe('SCROBBLE_SUCCESS', null, this.onScrobble);
			EventDispatcher.subscribe('SCROBBLE_ERROR', null, this.onScrobble);
			EventDispatcher.subscribe('SEARCH_ERROR', null, this.onSearchError);
			this.hasAddedListeners = true;
		} else if (!showNotifications && this.hasAddedListeners) {
			EventDispatcher.unsubscribe('SCROBBLE_SUCCESS', null, this.onScrobble);
			EventDispatcher.unsubscribe('SCROBBLE_ERROR', null, this.onScrobble);
			EventDispatcher.unsubscribe('SEARCH_ERROR', null, this.onSearchError);
			this.hasAddedListeners = false;
		}
	}

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

	onSearchError = async (data: SearchErrorData): Promise<void> => {
		const title = await this.getTitleFromException(data.error);
		const message = '';
		await this.show(title, message);
	};

	async getTitleFromException(err: RequestException): Promise<string> {
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
	}

	async show(title: string, message: string): Promise<void> {
		if (Shared.pageType === 'background') {
			const hasPermissions = await browser.permissions.contains({ permissions: ['notifications'] });
			if (hasPermissions) {
				await browser.notifications.create({
					type: 'basic',
					iconUrl: 'images/uts-icon-128.png',
					title,
					message,
				});
			}
		} else {
			await Messaging.toBackground({ action: 'show-notification', title, message });
		}
	}
}

const Notifications = new _Notifications();

export { Notifications };
