import { registerScrobbleParser } from '@common';
import { Api } from '@common/Api';
import { ScriptInjector } from '@common/ScriptInjector';
import { Item, SavedItem } from '@models/Item';

export interface ScrobbleParserOptions {
	/**
	 * The selector for the video player, if any.
	 *
	 * *Default:* `video`
	 */
	videoPlayerSelector: string | null;

	/**
	 * The URL regex to detect if the user is watching something, if possible. If the item ID can be extracted from the URL, make sure that it's the first capture group.
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

export abstract class ScrobbleParser {
	readonly api: Api;
	readonly options: Readonly<ScrobbleParserOptions>;
	protected item: Item | null = null;
	protected videoPlayer: HTMLVideoElement | null = null;
	private currentTime = 0.0;
	private progress = 0.0;

	constructor(api: Api, options: Partial<ScrobbleParserOptions> = {}) {
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
	 *   2. **injected script:** specific method (requires implementation of `playbackFnToInject`)
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
		for (const [name, method] of methods) {
			try {
				partialPlayback = await method();
			} catch (err) {
				//console.log(`Failed to parse playback from ${name}!`, err);
			}
			if (partialPlayback) {
				//console.log(`Playback parsed from ${name}!`);
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
		if (this.playbackFnToInject) {
			const playback = await ScriptInjector.inject<Partial<ScrobblePlayback>>(
				this.api.id,
				'playback',
				'',
				this.playbackFnToInject
			);
			return playback;
		}
		return null;
	}

	protected playbackFnToInject: (() => Partial<ScrobblePlayback> | null) | null = null;

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
	 *   2. **injected script:** specific method (requires implementation of `itemFnToInject`)
	 *   3. **DOM:** specific method (requires override)
	 *   4. **custom:** specific method (requires override)
	 */
	protected async parseItem(): Promise<Item | null> {
		let item: Item | null = null;

		const methods: [string, () => Promisable<Item | null>][] = [
			['API', () => this.parseItemFromApi()],
			['injected script', () => this.parseItemFromInjectedScript()],
			['DOM', () => this.parseItemFromDom()],
			['custom', () => this.parseItemFromCustom()],
		];
		for (const [name, method] of methods) {
			try {
				item = await method();
			} catch (err) {
				//console.log(`Failed to parse item from ${name}!`, err);
			}
			if (item) {
				//console.log(`Item parsed from ${name}!`);
				break;
			}
		}

		return item;
	}

	protected async parseItemFromApi(): Promise<Item | null> {
		const id = await this.parseItemId();
		return id ? this.api.getItem(id) : null;
	}

	protected async parseItemFromInjectedScript(): Promise<Item | null> {
		if (this.itemFnToInject) {
			const savedItem = await ScriptInjector.inject<SavedItem>(
				this.api.id,
				'item',
				'',
				this.itemFnToInject
			);
			if (savedItem) {
				return Item.load(savedItem);
			}
		}
		return null;
	}

	protected itemFnToInject: (() => SavedItem | null) | null = null;

	protected parseItemFromDom(): Promisable<Item | null> {
		return null;
	}

	protected parseItemFromCustom(): Promisable<Item | null> {
		return null;
	}

	/**
	 * Below are the methods that can be used to parse the item ID. Generic methods do not need to be overridden in the child class, as they should work out-of-the-box. If one method fails, the next one is attempted, in the order listed.
	 *
	 *   1. **URL:** generic method, based on `watchingUrlRegex`, which can be specified through the options
	 *   2. **injected script:** specific method (requires implementation of `itemIdFnToInject`)
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
		for (const [name, method] of methods) {
			try {
				id = await method();
			} catch (err) {
				//console.log(`Failed to parse item ID from ${name}!`, err);
			}
			if (id) {
				//console.log(`Item ID parsed from ${name}!`);
				break;
			}
		}

		return id;
	}

	protected parseItemIdFromUrl() {
		const id = this.options.watchingUrlRegex?.exec(this.getLocation())?.[1] ?? null;
		return id;
	}

	protected async parseItemIdFromInjectedScript(): Promise<string | null> {
		if (this.itemIdFnToInject) {
			const id = await ScriptInjector.inject<string>(
				this.api.id,
				'item-id',
				'',
				this.itemIdFnToInject
			);
			return id;
		}
		return null;
	}

	protected itemIdFnToInject: (() => string | null) | null = null;

	protected parseItemIdFromDom(): Promisable<string | null> {
		return null;
	}

	protected parseItemIdFromCustom(): Promisable<string | null> {
		return null;
	}

	getItem(): Item | null {
		return this.item;
	}

	clearItem(): void {
		this.item = null;
		this.currentTime = 0.0;
		this.progress = 0.0;
	}
}
