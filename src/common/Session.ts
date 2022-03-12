import { TraktAuth } from '@apis/TraktAuth';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';

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
				await Shared.events.dispatch('LOGIN_SUCCESS', null, { auth });
			} else {
				throw new Error(JSON.stringify(auth));
			}
		} catch (err) {
			this.isLoggedIn = false;
			if (Shared.errors.validate(err)) {
				await Shared.events.dispatch('LOGIN_ERROR', null, { error: err });
			}
		}
	}

	async login(): Promise<void> {
		try {
			const auth = await Messaging.toExtension({ action: 'login' });
			if (auth && auth.access_token) {
				this.isLoggedIn = true;
				await Shared.events.dispatch('LOGIN_SUCCESS', null, { auth });
			} else {
				throw new Error(JSON.stringify(auth));
			}
		} catch (err) {
			this.isLoggedIn = false;
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to log in.', err);
				await Shared.events.dispatch('LOGIN_ERROR', null, { error: err });
			}
		}
	}

	async logout(): Promise<void> {
		try {
			await Messaging.toExtension({ action: 'logout' });
			this.isLoggedIn = false;
			await Shared.events.dispatch('LOGOUT_SUCCESS', null, {});
		} catch (err) {
			this.isLoggedIn = true;
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to log out.', err);
				await Shared.events.dispatch('LOGOUT_ERROR', null, { error: err });
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
