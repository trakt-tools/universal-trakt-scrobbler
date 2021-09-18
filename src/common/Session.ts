import { TraktAuth } from '@apis/TraktAuth';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';

class _Session {
	isLoggedIn: boolean;

	constructor() {
		this.isLoggedIn = false;
	}

	async checkLogin(): Promise<void> {
		try {
			const auth = await TraktAuth.validateToken();
			if (auth && auth.access_token) {
				this.isLoggedIn = true;
				await EventDispatcher.dispatch('LOGIN_SUCCESS', null, { auth });
			} else {
				throw auth;
			}
		} catch (err) {
			this.isLoggedIn = false;
			if (Errors.validate(err)) {
				await EventDispatcher.dispatch('LOGIN_ERROR', null, { error: err });
			}
		}
	}

	async login(): Promise<void> {
		try {
			const auth = await Messaging.toExtension({ action: 'login' });
			if (auth && auth.access_token) {
				this.isLoggedIn = true;
				await EventDispatcher.dispatch('LOGIN_SUCCESS', null, { auth });
			} else {
				throw auth;
			}
		} catch (err) {
			this.isLoggedIn = false;
			if (Errors.validate(err)) {
				Errors.error('Failed to log in.', err);
				await EventDispatcher.dispatch('LOGIN_ERROR', null, { error: err });
			}
		}
	}

	async logout(): Promise<void> {
		try {
			await Messaging.toExtension({ action: 'logout' });
			this.isLoggedIn = false;
			await EventDispatcher.dispatch('LOGOUT_SUCCESS', null, {});
		} catch (err) {
			this.isLoggedIn = true;
			if (Errors.validate(err)) {
				Errors.error('Failed to log out.', err);
				await EventDispatcher.dispatch('LOGOUT_ERROR', null, { error: err });
			}
		}
	}

	async finishLogin(): Promise<void> {
		const redirectUrl = window.location.search;
		if (redirectUrl.includes('code')) {
			await Messaging.toExtension({ action: 'finish-login', redirectUrl });
		}
	}
}

export const Session = new _Session();
