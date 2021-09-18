import { Shared } from '@common/Shared';
import { format as dateFnsFormat } from 'date-fns';
import merge from 'deepmerge';
import { PartialDeep } from 'type-fest';

class _Utils {
	/**
	 * Checks if the difference between two dates is less or equal to a specified number of seconds.
	 */
	dateDiff(
		date1Param: Date | string | number,
		date2Param: Date | string | number,
		seconds: number
	) {
		const unix1 = this.unix(date1Param);
		const unix2 = this.unix(date2Param);
		return Math.abs(unix1 - unix2) <= seconds;
	}

	/**
	 * Returns a string timestamp for a date, in the specified format.
	 *
	 * @see https://date-fns.org/docs/format for accepted formats
	 */
	timestamp(dateParam?: Date | string | number, format = Shared.dateFormat) {
		let date: Date;
		if (typeof dateParam === 'undefined') {
			date = new Date();
		} else if (typeof dateParam === 'string') {
			date = new Date(dateParam);
		} else if (typeof dateParam === 'number') {
			if (dateParam >= 1e10) {
				// Is in milliseconds
				date = new Date(dateParam);
			} else {
				// Is in seconds
				date = new Date(dateParam * 1e3);
			}
		} else {
			date = dateParam;
		}
		return dateFnsFormat(date, format);
	}

	/**
	 * Returns a UNIX timestamp for a date, in seconds.
	 */
	unix(dateParam?: Date | string | number) {
		let unix: number;
		if (typeof dateParam === 'undefined') {
			unix = Math.trunc(Date.now() / 1e3);
		} else if (typeof dateParam === 'string') {
			const date = new Date(dateParam);
			unix = Math.trunc(date.getTime() / 1e3);
		} else if (typeof dateParam === 'number') {
			if (dateParam >= 1e10) {
				// Is in milliseconds
				unix = Math.trunc(dateParam / 1e3);
			} else {
				// Is in seconds
				unix = Math.trunc(dateParam);
			}
		} else {
			unix = Math.trunc(dateParam.getTime() / 1e3);
		}
		return unix;
	}

	/**
	 * Deeply merges the objects into a new object for immutability.
	 */
	mergeObjs<T extends Record<string, unknown>, U extends PartialDeep<T>[]>(
		obj: T,
		...partialObjs: U
	): T {
		return merge.all([obj, ...partialObjs]) as T;
	}

	/**
	 * Replaces placeholders in a string with values from a replacement object.
	 */
	replace(string: string, replaceObj: unknown, regex = /\{(.+?)}/g) {
		return string.replace(regex, (_, key: string) => (replaceObj as Record<string, string>)[key]);
	}
}

export const Utils = new _Utils();
