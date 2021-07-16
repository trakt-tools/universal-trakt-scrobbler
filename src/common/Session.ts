import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { RequestException } from '@common/Requests';

class _Session {
	isLoggedIn: boolean;

	constructor() {
		this.isLoggedIn = false;
	}

	async checkLogin(): Promise<void> {
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
	}

	async login(): Promise<void> {
		try {
			const auth = await Messaging.toBackground({ action: 'login' });
			if (auth && auth.access_token) {
				this.isLoggedIn = true;
				await EventDispatcher.dispatch('LOGIN_SUCCESS', null, { auth });
			} else {
				throw auth;
			}
		} catch (err) {
			this.isLoggedIn = false;
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to log in.', err);
				await EventDispatcher.dispatch('LOGIN_ERROR', null, { error: err as Error });
			}
		}
	}

	async logout(): Promise<void> {
		try {
			await Messaging.toBackground({ action: 'logout' });
			this.isLoggedIn = false;
			await EventDispatcher.dispatch('LOGOUT_SUCCESS', null, {});
		} catch (err) {
			this.isLoggedIn = true;
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to log out.', err);
				await EventDispatcher.dispatch('LOGOUT_ERROR', null, { error: err as Error });
			}
		}
	}

	async finishLogin(): Promise<void> {
		const redirectUrl = window.location.search;
		if (redirectUrl.includes('code')) {
			await Messaging.toBackground({ action: 'finish-login', redirectUrl });
		}
	}
}

export const Session = new _Session();
