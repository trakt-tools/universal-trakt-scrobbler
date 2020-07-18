import * as React from 'react';
import * as Rollbar from 'rollbar';
import { secrets } from '../secrets';
import { BrowserStorage } from './BrowserStorage';
import { ErrorData, EventDispatcher, ScrobbleErrorData } from './Events';
import { RequestException } from './Requests';

class _Errors {
	rollbar?: Rollbar;

	startRollbar = (): void => {
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
	};

	startListeners = (): void => {
		EventDispatcher.subscribe('SCROBBLE_ERROR', null, (data: ScrobbleErrorData) =>
			this.onItemError(data, 'scrobble')
		);
		EventDispatcher.subscribe('SEARCH_ERROR', null, (data: ErrorData) =>
			this.onItemError(data, 'find')
		);
	};

	onItemError = async (
		data: ScrobbleErrorData | ErrorData,
		type: 'scrobble' | 'find'
	): Promise<void> => {
		if (data.error) {
			const values = await BrowserStorage.get('auth');
			if (values.auth && values.auth.access_token) {
				this.error(`Failed to ${type} item.`, data.error);
			} else {
				this.warning(`Failed to ${type} item.`, data.error);
			}
		}
	};

	log = (message: Error | string, details: Error | RequestException | React.ErrorInfo): void => {
		console.log(`[UTS] ${message.toString()}`, details);
	};

	warning = (message: string, details: Error | RequestException): void => {
		console.warn(`[UTS] ${message}`, details);
		if (this.rollbar) {
			this.rollbar.warning(message, 'message' in details ? { message: details.message } : details);
		}
	};

	error = (message: string, details: Error | RequestException): void => {
		console.error(`[UTS] ${message}`, details);
		if (this.rollbar) {
			this.rollbar.error(message, 'message' in details ? { message: details.message } : details);
		}
	};
}

export const Errors = new _Errors();
