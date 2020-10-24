import { CorrectionSuggestion } from '../models/Item';
import { StreamingServiceId } from '../streaming-services/streaming-services';

export interface CacheValues {
	correctionSuggestions: Partial<
		Record<StreamingServiceId, Record<string, CorrectionSuggestion[] | undefined>>
	>;
	tmdbImages: Record<string, string>;
}

class _Cache {
	private timers: Record<keyof CacheValues, number | null> = {
		correctionSuggestions: null,
		tmdbImages: null,
	};

	/** In seconds. */
	private expiries: Record<keyof CacheValues, number> = {
		correctionSuggestions: 360,
		tmdbImages: 360,
	};

	readonly values: CacheValues;

	constructor() {
		this.values = this.getInitialValues();
		this.startTimers();
	}

	private getInitialValues = (): CacheValues => {
		return {
			correctionSuggestions: {},
			tmdbImages: {},
		};
	};

	private invalidate = <K extends keyof CacheValues>(key: K, expiry: number): void => {
		this.values[key] = this.getInitialValues()[key];
		this.timers[key] = window.setTimeout(this.invalidate, expiry * 1e3, key, expiry);
	};

	startTimers = (): void => {
		for (const [key, expiry] of Object.entries(this.expiries) as [keyof CacheValues, number][]) {
			if (this.timers[key] === null) {
				this.timers[key] = window.setTimeout(this.invalidate, expiry * 1e3, key, expiry);
			}
		}
	};

	stopTimers = () => {
		for (const [key, timer] of Object.entries(this.timers) as [
			keyof CacheValues,
			number | null
		][]) {
			if (timer !== null) {
				window.clearTimeout(timer);
				this.timers[key] = null;
			}
		}
	};
}

export const Cache = new _Cache();
