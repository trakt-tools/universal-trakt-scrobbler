import { BrowserStorage } from '@common/BrowserStorage';
import {
	EventDispatcher,
	ScrobbleErrorData,
	SearchErrorData,
	StorageOptionsChangeData,
} from '@common/Events';
import { RequestError } from '@common/Requests';
import { Shared } from '@common/Shared';
import { ErrorInfo } from 'react';
import Rollbar from 'rollbar';

class _Errors {
	rollbar?: Rollbar;

	init() {
		this.checkRollbar();
		EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
		EventDispatcher.subscribe('SCROBBLE_ERROR', null, (data: ScrobbleErrorData) =>
			this.onItemError(data, 'scrobble')
		);
		EventDispatcher.subscribe('SEARCH_ERROR', null, (data: SearchErrorData) =>
			this.onItemError(data, 'find')
		);
	}

	onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		if (data.options && 'allowRollbar' in data.options) {
			this.checkRollbar();
		}
	};

	checkRollbar() {
		const { allowRollbar } = BrowserStorage.options;
		if (allowRollbar && !this.rollbar) {
			this.rollbar = new Rollbar({
				accessToken: Shared.rollbarToken,
				autoInstrument: {
					network: false, // Do not set to true on Firefox (see https://github.com/rollbar/rollbar.js/issues/638).
				},
				captureIp: false,
				captureUncaught: true,
				captureUnhandledRejections: true,
				payload: {
					environment: Shared.environment,
				},
			});
			window.Rollbar = this.rollbar;
		} else if (!allowRollbar && this.rollbar) {
			delete this.rollbar;
			delete window.Rollbar;
		}
	}

	async onItemError(
		data: ScrobbleErrorData | SearchErrorData,
		type: 'scrobble' | 'find'
	): Promise<void> {
		if (data.error) {
			const values = await BrowserStorage.get('auth');
			if (values.auth && values.auth.access_token) {
				this.error(`Failed to ${type} item.`, data.error);
			} else {
				this.warning(`Failed to ${type} item.`, data.error);
			}
		}
	}

	log(message: Error | string, details: Error | ErrorInfo): void {
		console.log(`[UTS] ${message.toString()}`, details);
	}

	warning(message: string, details: Error): void {
		console.warn(`[UTS] ${message}`, details);
		if (this.rollbar) {
			this.rollbar.warning(message, details.message);
		}
	}

	error(message: string, details: Error): void {
		console.error(`[UTS] ${message}`, details);
		if (this.rollbar) {
			this.rollbar.error(message, details.message);
		}
	}

	validate(err: unknown): err is Error {
		return (err instanceof RequestError && !err.isCanceled) || err instanceof Error;
	}
}

export const Errors = new _Errors();
