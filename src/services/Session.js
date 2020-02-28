import { Errors } from './Errors';
import { Events } from './Events';
import { Messaging } from './Messaging';

class _Session {
  constructor() {
    this.isLoggedIn = false;

    this.checkLogin = this.checkLogin.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.finishLogin = this.finishLogin.bind(this);
  }

  /**
   * @returns {Promise}
   */
  async checkLogin() {
    try {
      const auth = await Messaging.toBackground({ action: 'check-login' });
      if (auth && auth.access_token) {
        this.isLoggedIn = true;
        await Events.dispatch(Events.LOGIN_SUCCESS, { auth });
      } else {
        throw auth;
      }
    } catch (err) {
      this.isLoggedIn = false;
      await Events.dispatch(Events.LOGIN_ERROR, {});
    }
  }

  /**
   * @returns {Promise}
   */
  async login() {
    try {
      const auth = await Messaging.toBackground({ action: 'login' });
      if (auth && auth.access_token) {
        this.isLoggedIn = true;
        await Events.dispatch(Events.LOGIN_SUCCESS, { auth });
      } else {
        throw auth;
      }
    } catch (err) {
      Errors.error('Failed to log in.', err);
      this.isLoggedIn = false;
      await Events.dispatch(Events.LOGIN_ERROR, { error: err });
    }
  }

  /**
   * @returns {Promise}
   */
  async logout() {
    try {
      await Messaging.toBackground({ action: 'logout' });
      this.isLoggedIn = false;
      await Events.dispatch(Events.LOGOUT_SUCCESS, {});
    } catch (err) {
      Errors.error('Failed to log out.', err);
      this.isLoggedIn = true;
      await Events.dispatch(Events.LOGOUT_ERROR, { error: err });
    }
  }

  /**
   * @returns {Promise}
   */
  async finishLogin() {
    const redirectUrl = window.location.search;
    if (redirectUrl.includes('code')) {
      await Messaging.toBackground({ action: 'finish-login', redirectUrl });
    }
  }
}

const Session = new _Session();

export { Session };