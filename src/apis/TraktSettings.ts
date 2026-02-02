import { TraktApi } from '@apis/TraktApi';
import { Cache } from '@common/Cache';

export interface TraktSettingsResponse {
	account: TraktAccount;
}

export interface TraktAccount {
	timezone: string;
	date_format: 'mdy' | 'dmy' | 'ymd' | 'ydm';
	time_24hr: boolean;
}

class _TraktSettings extends TraktApi {
	constructor() {
		super();
	}

	async getTimeAndDateFormat() {
		let dateFormat = 'EEE ';
		try {
			const cache = await Cache.get('traktSettings');
			let settings = cache.get('default');
			if (!settings) {
				await this.activate();
				const responseText = await this.requests.send({
					url: this.SETTINGS_URL,
					method: 'GET',
				});
				settings = JSON.parse(responseText) as TraktSettingsResponse;
				cache.set('default', settings);
				await Cache.set({ traktSettings: cache });
			}
			switch (settings.account.date_format) {
				case 'dmy':
					dateFormat += 'd MMM yyyy';
					break;
				case 'mdy':
					dateFormat += 'MMM d yyyy';
					break;
				case 'ydm':
					dateFormat += 'yyyy d MMM';
					break;
				case 'ymd':
					dateFormat += 'yyyy MMM d';
					break;
				default:
					console.error('Unknown date format', settings.account.date_format);
					dateFormat += 'd MMM yyyy, H:mm:ss';
					return dateFormat;
			}
			if (settings.account.time_24hr) {
				dateFormat += ', H:mm:ss';
			} else {
				dateFormat += ', h:mm:ss aaa';
			}
		} catch (_err) {
			dateFormat += 'd MMM yyyy, H:mm:ss';
		}
		return dateFormat;
	}
}

export const TraktSettings = new _TraktSettings();
