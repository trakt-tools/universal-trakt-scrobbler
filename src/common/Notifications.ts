import { TraktScrobble } from '@apis/TraktScrobble';
import {
	ScrobbleErrorData,
	ScrobbleSuccessData,
	SearchErrorData,
	StorageOptionsChangeData,
} from '@common/Events';
import { I18N } from '@common/I18N';
import { Messaging } from '@common/Messaging';
import { RequestError } from '@common/Requests';
import { Shared } from '@common/Shared';
import browser from 'webextension-polyfill';

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
		Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
	}

	private onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		if (data.options && 'showNotifications' in data.options) {
			this.checkListeners();
		}
	};

	checkListeners() {
		const { showNotifications } = Shared.storage.options;
		if (showNotifications && !this.hasAddedListeners) {
			Shared.events.subscribe('SCROBBLE_SUCCESS', null, this.onScrobble);
			Shared.events.subscribe('SCROBBLE_ERROR', null, this.onScrobble);
			Shared.events.subscribe('SEARCH_ERROR', null, this.onSearchError);
			this.hasAddedListeners = true;
		} else if (!showNotifications && this.hasAddedListeners) {
			Shared.events.unsubscribe('SCROBBLE_SUCCESS', null, this.onScrobble);
			Shared.events.unsubscribe('SCROBBLE_ERROR', null, this.onScrobble);
			Shared.events.unsubscribe('SEARCH_ERROR', null, this.onSearchError);
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

	async getTitleFromException(err: Error): Promise<string> {
		if (!err) {
			return I18N.translate('errorNotification');
		}

		if (err instanceof RequestError) {
			if (err.status === 404) {
				return I18N.translate('errorNotificationNotFound');
			}

			if (err.status === 0) {
				const { auth } = await Shared.storage.get('auth');

				if (auth?.access_token) {
					return I18N.translate('errorNotificationServers');
				}

				return I18N.translate('errorNotificationLogin');
			}
		}

		return I18N.translate('errorNotificationServers');
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
			await Messaging.toExtension({ action: 'show-notification', title, message });
		}
	}
}

const Notifications = new _Notifications();

export { Notifications };
