import { ServiceApi } from '@apis/ServiceApi';
import { ScriptInjector } from '@common/ScriptInjector';
import { Shared } from '@common/Shared';
import { createScrobbleItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';

export interface ScrobbleParserOptions {
	/**
	 * The selector for the video player, if any.
	 *
	 * *Default:* `video`
	 */
	videoPlayerSelector: string | null;

	/**
	 * The URL regex to detect if the user is watching something, if possible. If the item ID can be extracted from the URL, make sure that it's in a named capture group called "id".
	 *
	 * *Default:* `null`
	 */
	watchingUrlRegex: RegExp | null;
}

export interface ScrobblePlayback {
	isPaused: boolean;
	currentTime?: number;
	duration?: number;
	progress: number;
}

const scrobbleParsers = new Map<string, ScrobbleParser>();

export const registerScrobbleParser = (id: string, parser: ScrobbleParser): void => {
	scrobbleParsers.set(id, parser);
};

export const getScrobbleParser = (id: string): ScrobbleParser => {
	const parser = scrobbleParsers.get(id);
	if (!parser) {
		throw new Error(`Scrobble parser not registered for ${id}`);
	}
	return parser;
};

export abstract class ScrobbleParser {
	readonly api: ServiceApi;
	readonly options: Readonly<ScrobbleParserOptions>;
	protected item: ScrobbleItem | null = null;
	protected videoPlayer: HTMLVideoElement | null = null;
	private currentTime = 0.0;
	private progress = 0.0;
	private failingId: string | null = null;

	constructor(api: ServiceApi, options: Partial<ScrobbleParserOptions> = {}) {
		this.api = api;
		this.options = Object.freeze({
			...this.getDefaultOptions(),
			...options,
		});

		registerScrobbleParser(this.api.id, this);
	}

	protected getDefaultOptions(): ScrobbleParserOptions {
		return {
			videoPlayerSelector: 'video',
			watchingUrlRegex: null,
		};
	}

	protected getLocation(): string {
		return window.location.href;
	}

	/**
	 * For some streaming services, information has to be parsed when the user clicks on the play button.
	 *
	 * If that's the case, this method should be implemented in the child class.
	 *
	 * The information should be stored in the class and later retrieved by the custom methods.
	 */
	onClick: ((event: Event) => void) | null = null;

	/**
	 * Below are the methods that can be used to parse the playback. Generic methods do not need to be overridden in the child class, as they should work out-of-the-box. If one method fails, the next one is attempted, in the order listed.
	 *
	 *   1. **video player:** generic method, based on `videoPlayerSelector`, which can be specified through the options
	 *   2. **injected script:** specific method (requires adding a function to the `{serviceId}-playback` key in `Shared.functionsToInject` at the `{serviceName}Api.ts` file e.g. `netflix-playback` at `NetflixApi.ts`)
	 *   3. **DOM:** specific method (requires override)
	 *   4. **custom:** specific method (requires override)
	 */
	async parsePlayback(): Promise<ScrobblePlayback | null> {
		let playback: ScrobblePlayback | null = null;
		let partialPlayback: Partial<ScrobblePlayback> | null = null;

		const methods: [string, () => Promisable<Partial<ScrobblePlayback> | null>][] = [
			['video player', () => this.parsePlaybackFromVideoPlayer()],
			['injected script', () => this.parsePlaybackFromInjectedScript()],
			['DOM', () => this.parsePlaybackFromDom()],
			['custom', () => this.parsePlaybackFromCustom()],
		];
		for (const [_name, method] of methods) {
			try {
				partialPlayback = await method();
			} catch (_err) {
				//console.log(`Failed to parse playback from ${_name}!`, err);
			}
			if (partialPlayback) {
				//console.log(`Playback parsed from ${_name}!`);
				break;
			}
		}

		if (partialPlayback) {
			if (
				typeof partialPlayback.progress === 'undefined' &&
				typeof partialPlayback.currentTime !== 'undefined' &&
				typeof partialPlayback.duration !== 'undefined'
			) {
				partialPlayback.progress = (partialPlayback.currentTime / partialPlayback.duration) * 100;
			}
			if (typeof partialPlayback.isPaused === 'undefined') {
				if (typeof partialPlayback.currentTime !== 'undefined') {
					partialPlayback.isPaused = this.currentTime === partialPlayback.currentTime;
					this.currentTime = partialPlayback.currentTime;
				} else if (typeof partialPlayback.progress !== 'undefined') {
					partialPlayback.isPaused = this.progress === partialPlayback.progress;
					this.progress = partialPlayback.progress;
				}
			}
			if (typeof partialPlayback.progress !== 'undefined' && partialPlayback.progress > 0.0) {
				playback = {
					isPaused: partialPlayback.isPaused ?? true,
					progress: partialPlayback.progress,
				};
			}
		}

		if (playback && !this.item) {
			this.item = await this.parseItem();
		}

		return this.item ? playback : null;
	}

	protected parsePlaybackFromVideoPlayer(): Promisable<Partial<ScrobblePlayback> | null> {
		if (!this.options.videoPlayerSelector) {
			return null;
		}

		if (
			this.videoPlayer &&
			(!document.body.contains(this.videoPlayer) ||
				!this.videoPlayer.matches(this.options.videoPlayerSelector))
		) {
			// Video player has either been removed from the DOM or no longer matches selector
			this.videoPlayer = null;
			return null;
		}

		if (!this.videoPlayer) {
			this.videoPlayer = document.querySelector(this.options.videoPlayerSelector);
		}

		return this.videoPlayer?.duration
			? {
					isPaused: this.videoPlayer.paused,
					currentTime: this.videoPlayer.currentTime,
					duration: this.videoPlayer.duration,
				}
			: null;
	}

	protected async parsePlaybackFromInjectedScript(): Promise<Partial<ScrobblePlayback> | null> {
		if (`${this.api.id}-playback` in Shared.functionsToInject) {
			const playback = await ScriptInjector.inject<Partial<ScrobblePlayback>>(
				this.api.id,
				'playback',
				''
			);
			return playback;
		}
		return null;
	}

	protected parsePlaybackFromDom(): Promisable<Partial<ScrobblePlayback> | null> {
		return null;
	}

	protected parsePlaybackFromCustom(): Promisable<Partial<ScrobblePlayback> | null> {
		return null;
	}

	/**
	 * Below are the methods that can be used to parse the item. Generic methods do not need to be overridden in the child class, as they should work out-of-the-box. If one method fails, the next one is attempted, in the order listed.
	 *
	 *   1. **API:** generic method, but requires a non-null return from `parseItemId` and the implementation of `*Api#getItem`
	 *   2. **injected script:** specific method (requires adding a function to the `{serviceId}-item` key in `Shared.functionsToInject` at the `{serviceName}Api.ts` file e.g. `netflix-item` at `NetflixApi.ts`)
	 *   3. **DOM:** specific method (requires override)
	 *   4. **custom:** specific method (requires override)
	 */
	protected async parseItem(): Promise<ScrobbleItem | null> {
		let item: ScrobbleItem | null = null;

		const methods: [string, () => Promisable<ScrobbleItem | null>][] = [
			['API', () => this.parseItemFromApi()],
			['injected script', () => this.parseItemFromInjectedScript()],
			['DOM', () => this.parseItemFromDom()],
			['custom', () => this.parseItemFromCustom()],
		];
		for (const [_name, method] of methods) {
			try {
				item = await method();
			} catch (_err) {
				//console.log(`Failed to parse item from ${_name}!`, err);
			}
			if (item) {
				//console.log(`Item parsed from ${_name}!`);
				break;
			}
		}

		return item;
	}

	protected async parseItemFromApi(): Promise<ScrobbleItem | null> {
		const id = await this.parseItemId();
		if (!id || id === this.failingId) {
			return null;
		}

		const item = await this.api.getItem(id);
		this.failingId = item ? null : id;
		return item;
	}

	protected async parseItemFromInjectedScript(): Promise<ScrobbleItem | null> {
		if (`${this.api.id}-item` in Shared.functionsToInject) {
			const savedItem = await ScriptInjector.inject<ScrobbleItemValues>(this.api.id, 'item', '');
			if (savedItem) {
				return createScrobbleItem(savedItem);
			}
		}
		return null;
	}

	protected parseItemFromDom(): Promisable<ScrobbleItem | null> {
		return null;
	}

	protected parseItemFromCustom(): Promisable<ScrobbleItem | null> {
		return null;
	}

	/**
	 * Below are the methods that can be used to parse the item ID. Generic methods do not need to be overridden in the child class, as they should work out-of-the-box. If one method fails, the next one is attempted, in the order listed.
	 *
	 *   1. **URL:** generic method, based on `watchingUrlRegex`, which can be specified through the options
	 *   2. **injected script:** specific method (requires adding a function to the `{serviceId}-item-id` key in `Shared.functionsToInject` at the `{serviceName}Api.ts` file e.g. `netflix-item-id` at `NetflixApi.ts`)
	 *   3. **DOM:** specific method (requires override)
	 *   4. **custom:** specific method (requires override)
	 */
	protected async parseItemId(): Promise<string | null> {
		let id: string | null = null;

		const methods: [string, () => Promisable<string | null>][] = [
			['URL', () => this.parseItemIdFromUrl()],
			['injected script', () => this.parseItemIdFromInjectedScript()],
			['DOM', () => this.parseItemIdFromDom()],
			['custom', () => this.parseItemIdFromCustom()],
		];
		for (const [_name, method] of methods) {
			try {
				id = await method();
			} catch (_err) {
				//console.log(`Failed to parse item ID from ${_name}!`, err);
			}
			if (id) {
				//console.log(`Item ID parsed from ${_name}!`);
				break;
			}
		}

		return id;
	}

	protected parseItemIdFromUrl(): string | null {
		const {
			id = null,
			episodeId = null,
			movieId = null,
		} = this.options.watchingUrlRegex?.exec(this.getLocation())?.groups ?? {};
		return episodeId || movieId || id;
	}

	protected async parseItemIdFromInjectedScript(): Promise<string | null> {
		if (`${this.api.id}-item-id` in Shared.functionsToInject) {
			const id = await ScriptInjector.inject<string>(this.api.id, 'item-id', '');
			return id;
		}
		return null;
	}

	protected parseItemIdFromDom(): Promisable<string | null> {
		return null;
	}

	protected parseItemIdFromCustom(): Promisable<string | null> {
		return null;
	}

	getItem(): ScrobbleItem | null {
		return this.item;
	}

	clearItem(): void {
		this.item = null;
		this.currentTime = 0.0;
		this.progress = 0.0;
	}
}
