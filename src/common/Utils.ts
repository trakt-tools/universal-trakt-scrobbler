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
}

export const Utils = new _Utils();
