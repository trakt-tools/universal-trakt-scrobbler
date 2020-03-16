import * as Rollbar from 'rollbar';
import { secrets } from '../secrets';
import { BrowserStorage } from './BrowserStorage';
import { Events, EventDispatcher } from './Events';
import * as React from "react";

class _Errors {
  rollbar: Rollbar;

  constructor() {
    this.rollbar = null;

    this.startRollbar = this.startRollbar.bind(this);
    this.startListeners = this.startListeners.bind(this);
    this.onSearchError = this.onSearchError.bind(this);
    this.log = this.log.bind(this);
    this.warning = this.warning.bind(this);
    this.error = this.error.bind(this);
  }

  startRollbar(): void {
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
    (window as any).Rollbar = this.rollbar;
  }

  startListeners(): void {
    EventDispatcher.subscribe(Events.SEARCH_ERROR, this.onSearchError);
  }

  async onSearchError(data: ErrorEventData): Promise<void> {
    if (data.error) {
      const values = await BrowserStorage.get('auth');
      if (values.auth && values.auth.access_token) {
        this.error('Failed to find item.', data.error);
      } else {
        this.warning('Failed to find item.', data.error);
      }
    }
  }

  log(message: Error | string, details: ErrorDetails | RequestException | React.ErrorInfo): void {
    console.log(`[UTS] ${message}`, details);
  }

  warning(message: string, details: ErrorDetails | RequestException): void {
    console.warn(`[UTS] ${message}`, details);
    if (this.rollbar) {
      this.rollbar.warning(message, 'message' in details ? { message: details.message } : details);
    }
  }

  error(message: string, details: ErrorDetails | RequestException): void {
    console.error(`[UTS] ${message}`, details);
    if (this.rollbar) {
      this.rollbar.error(message, 'message' in details ? { message: details.message } : details);
    }
  }
}

const Errors = new _Errors();

export { Errors };
