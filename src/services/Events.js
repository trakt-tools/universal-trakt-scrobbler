import { Errors } from './Errors';

class _Events {
  constructor() {
    this.LOGIN_SUCCESS = 1;
    this.LOGIN_ERROR = 2;
    this.LOGOUT_SUCCESS = 3;
    this.LOGOUT_ERROR = 4;
    this.SEARCH_SUCCESS = 5;
    this.SEARCH_ERROR = 6;
    this.OPTIONS_CHANGE = 7;
    this.OPTIONS_CLEAR = 8;
    this.DIALOG_SHOW = 9;
    this.SNACKBAR_SHOW = 10;
    this.HISTORY_OPTIONS_CHANGE = 11;
    this.STREAMING_SERVICE_STORE_UPDATE = 12;
    this.STREAMING_SERVICE_HISTORY_LOAD_ERROR = 13;
    this.STREAMING_SERVICE_HISTORY_CHANGE = 14;
    this.TRAKT_HISTORY_LOAD_ERROR = 15;
    this.HISTORY_SYNC_SUCCESS = 16;
    this.HISTORY_SYNC_ERROR = 17;


    /** @type {Object<number, Array<Function>>} */
    this.listeners = {};

    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.dispatch = this.dispatch.bind(this);
  }

  /**
   * @param {number} eventType
   * @param {Function} listener
   */
  subscribe(eventType, listener) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
  }

  /**
   * @param {number} eventType
   * @param {Function} listener
   */
  unsubscribe(eventType, listener) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(fn => fn !== listener);
    }
  }

  /**
   * @param {number} eventType
   * @param {Object<string, any>} data
   * @returns {Promise}
   */
  async dispatch(eventType, data) {
    if (this.listeners[eventType]) {
      for (const listener of this.listeners[eventType]) {
        try {
          await listener(data);
        } catch (err) {
          Errors.log('Failed to dispatch.', err);
        }
      }
    }
  }
}

const Events = new _Events();

export { Events };
