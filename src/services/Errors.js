import Rollbar from 'rollbar';
import { secrets } from '../secrets';
import { BrowserStorage } from './BrowserStorage';
import { Events } from './Events';

class _Errors {
  constructor() {
    /** @type {Rollbar} */
    this.rollbar = null;

    this.startRollbar = this.startRollbar.bind(this);
    this.startListeners = this.startListeners.bind(this);
    this.onSearchError = this.onSearchError.bind(this);
    this.log = this.log.bind(this);
    this.warning = this.warning.bind(this);
    this.error = this.error.bind(this);
  }

  startRollbar() {
    this.rollbar = Rollbar.init({
      accessToken: secrets.rollbarToken,
      autoInstrument: {
        network: false, // Do not set to true on Firefox (see https://github.com/rollbar/rollbar.js/issues/638).
      },
      captureIp: false,
      captureUncaught: true,
      captureUnhandledRejections: true,
      payload: {
        environment: 'production',
      },
    });
    window.Rollbar = this.rollbar;
  }

  startListeners() {
    Events.subscribe(Events.SEARCH_ERROR, this.onSearchError);
  }

  /**
   * @param {ErrorEventData} data
   * @returns {Promise}
   */
   async onSearchError(data) {
    if (data.error) {
      const values = await BrowserStorage.get('auth');
      if (values.auth && values.auth.access_token) {
        this.error('Failed to find item.', data.error);
      } else {
        this.warning('Failed to find item.', data.error);
      }
    }
  }

  /**
   * @param {string} message
   * @param {Object<string, any>} details
   */
  log(message, details) {
    console.log(`[UTS] ${message}`, details);
  }

  /**
   * @param {string} message
   * @param {Object<string, any>} details
   */
  warning(message, details) {
    console.warn(`[UTS] ${message}`, details);
    if (this.rollbar) {
      this.rollbar.warning(message, details.message ? { message: details.message } : details);
    }
  }

  /**
   * @param {string} message
   * @param {Object<string, any>} details
   */
  error(message, details) {
    console.error(`[UTS] ${message}`, details);
    if (this.rollbar) {
      this.rollbar.error(message, details.message ? { message: details.message } : details);
    }
  }
}

const Errors = new _Errors();

export { Errors };