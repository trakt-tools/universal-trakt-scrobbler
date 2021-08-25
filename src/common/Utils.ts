import merge from 'deepmerge';
import { PartialDeep } from 'type-fest';

class _Utils {
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
