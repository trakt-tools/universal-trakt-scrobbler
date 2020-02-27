import { Errors } from './Errors';
import { Events, EventDispatcher } from './Events';
import { Messaging } from './Messaging';

class _Session {
  isLoggedIn: boolean;

  constructor() {
    this.isLoggedIn = false;

    this.checkLogin = this.checkLogin.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.finishLogin = this.finishLogin.bind(this);
  }

  async checkLogin(): Promise<void> {
    try {
      const auth = await Messaging.toBackground({ action: 'check-login' });
      if (auth && auth.access_token) {
        this.isLoggedIn = true;
        await EventDispatcher.dispatch(Events.LOGIN_SUCCESS, { auth });
      } else {
        throw auth;
      }
    } catch (err) {
      this.isLoggedIn = false;
      await EventDispatcher.dispatch(Events.LOGIN_ERROR, {});
    }
  }

  async login(): Promise<void> {
    try {
      const auth = await Messaging.toBackground({ action: 'login' });
      if (auth && auth.access_token) {
        this.isLoggedIn = true;
        await EventDispatcher.dispatch(Events.LOGIN_SUCCESS, { auth });
      } else {
        throw auth;
      }
    } catch (err) {
      Errors.error('Failed to log in.', err);
      this.isLoggedIn = false;
      await EventDispatcher.dispatch(Events.LOGIN_ERROR, { error: err });
    }
  }

  async logout(): Promise<void> {
    try {
      await Messaging.toBackground({ action: 'logout' });
      this.isLoggedIn = false;
      await EventDispatcher.dispatch(Events.LOGOUT_SUCCESS, {});
    } catch (err) {
      Errors.error('Failed to log out.', err);
      this.isLoggedIn = true;
      await EventDispatcher.dispatch(Events.LOGOUT_ERROR, { error: err });
    }
  }

  async finishLogin(): Promise<void> {
    const redirectUrl = window.location.search;
    if (redirectUrl.includes('code')) {
      await Messaging.toBackground({ action: 'finish-login', redirectUrl });
    }
  }
}

const Session = new _Session();

export { Session };