import { Suggestion } from '@apis/CorrectionApi';

export interface CacheValues {
	suggestions: Partial<Record<string, Suggestion[] | null>>;
	imageUrls: Partial<Record<string, string | null>>;
}

class _Cache {
	private timers: Record<keyof CacheValues, number | null> = {
		suggestions: null,
		imageUrls: null,
	};

	/** In seconds. */
	private expiries: Record<keyof CacheValues, number> = {
		suggestions: 360,
		imageUrls: 360,
	};

	readonly values: CacheValues;

	constructor() {
		this.values = this.getInitialValues();
		this.startTimers();
	}

	private getInitialValues(): CacheValues {
		return {
			suggestions: {},
			imageUrls: {},
		};
	}

	private invalidate<K extends keyof CacheValues>(key: K, expiry: number): void {
		this.values[key] = this.getInitialValues()[key];
		this.timers[key] = window.setTimeout(() => this.invalidate(key, expiry), expiry * 1e3);
	}

	startTimers(): void {
		for (const [key, expiry] of Object.entries(this.expiries) as [keyof CacheValues, number][]) {
			if (this.timers[key] === null) {
				this.timers[key] = window.setTimeout(() => this.invalidate(key, expiry), expiry * 1e3);
			}
		}
	}

	stopTimers() {
		for (const [key, timer] of Object.entries(this.timers) as [
			keyof CacheValues,
			number | null
		][]) {
			if (timer !== null) {
				window.clearTimeout(timer);
				this.timers[key] = null;
			}
		}
	}

	setValue<K extends keyof CacheValues>(key: K, value: CacheValues[K]) {
		Cache.values[key] = value;
	}

	getValue<K extends keyof CacheValues>(key: K): CacheValues[K] {
		return this.values[key];
	}
}

export const Cache = new _Cache();
