import { Errors } from './Errors';
import { EventDispatcher } from './Events';
import { Messaging } from './Messaging';

class _Session {
	isLoggedIn: boolean;

	constructor() {
		this.isLoggedIn = false;
	}

	checkLogin = async (): Promise<void> => {
		try {
			const auth = await Messaging.toBackground({ action: 'check-login' });
			if (auth && auth.access_token) {
				this.isLoggedIn = true;
				await EventDispatcher.dispatch('LOGIN_SUCCESS', null, { auth });
			} else {
				throw auth;
			}
		} catch (err) {
			this.isLoggedIn = false;
			await EventDispatcher.dispatch('LOGIN_ERROR', null, { error: err as Error });
		}
	};

	login = async (): Promise<void> => {
		try {
			const auth = await Messaging.toBackground({ action: 'login' });
			if (auth && auth.access_token) {
				this.isLoggedIn = true;
				await EventDispatcher.dispatch('LOGIN_SUCCESS', null, { auth });
			} else {
				throw auth;
			}
		} catch (err) {
			Errors.error('Failed to log in.', err);
			this.isLoggedIn = false;
			await EventDispatcher.dispatch('LOGIN_ERROR', null, { error: err as Error });
		}
	};

	logout = async (): Promise<void> => {
		try {
			await Messaging.toBackground({ action: 'logout' });
			this.isLoggedIn = false;
			await EventDispatcher.dispatch('LOGOUT_SUCCESS', null, {});
		} catch (err) {
			Errors.error('Failed to log out.', err);
			this.isLoggedIn = true;
			await EventDispatcher.dispatch('LOGOUT_ERROR', null, { error: err as Error });
		}
	};

	finishLogin = async (): Promise<void> => {
		const redirectUrl = window.location.search;
		if (redirectUrl.includes('code')) {
			await Messaging.toBackground({ action: 'finish-login', redirectUrl });
		}
	};
}

export const Session = new _Session();
