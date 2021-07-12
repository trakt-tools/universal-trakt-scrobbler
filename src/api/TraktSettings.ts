import { TraktApi } from '@api/TraktApi';
import { Requests } from '@common/Requests';

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
		let dateFormat = 'ddd ';
		try {
			const responseText = await Requests.send({
				url: this.SETTINGS_URL,
				method: 'GET',
			});
			const settings = JSON.parse(responseText) as TraktSettingsResponse;
			switch (settings.account.date_format) {
				case 'dmy':
					dateFormat += 'D MMM YYYY';
					break;
				case 'mdy':
					dateFormat += 'MMM D YYYY';
					break;
				case 'ydm':
					dateFormat += 'YYYY D MMM';
					break;
				case 'ymd':
					dateFormat += 'YYYY MMM D';
					break;
				default:
					console.error('Unknown date format', settings.account.date_format);
					dateFormat += 'D MMM YYYY, H:mm:ss';
					return dateFormat;
			}
			if (settings.account.time_24hr) {
				dateFormat += ', H:mm:ss';
			} else {
				dateFormat += ', h:mm:ss a';
			}
		} catch (err) {
			dateFormat += 'D MMM YYYY, H:mm:ss';
		}
		return dateFormat;
	}
}

export const TraktSettings = new _TraktSettings();
