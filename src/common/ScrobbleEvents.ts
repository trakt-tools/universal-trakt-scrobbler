import { EventDispatcher } from '@common/Events';
import { ScrobbleParser } from '@common/ScrobbleParser';

export interface ScrobbleEventsOptions {
	/**
	 * How frequently to check for changes, in seconds.
	 *
	 * *Default:* `0.5`
	 */
	checkFrequency: number;
}

const scrobbleEvents = new Map<string, ScrobbleEvents>();

export const registerScrobbleEvents = (id: string, events: ScrobbleEvents) => {
	scrobbleEvents.set(id, events);
};

export const getScrobbleEvents = (id: string) => {
	const events = scrobbleEvents.get(id);
	if (!events) {
		throw new Error(`Scrobble events not registered for ${id}`);
	}
	return events;
};

export abstract class ScrobbleEvents {
	readonly parser: ScrobbleParser;
	readonly options: Readonly<ScrobbleEventsOptions>;
	protected changeListenerId: number | null = null;
	protected url = '';
	protected playbackStarted = false;
	protected isPaused = true;
	protected progress = 0.0;

	constructor(parser: ScrobbleParser, options: Partial<ScrobbleEventsOptions> = {}) {
		this.parser = parser;
		this.options = Object.freeze({
			...this.getDefaultOptions(),
			...options,
		});

		registerScrobbleEvents(this.parser.api.id, this);
	}

	protected getDefaultOptions(): ScrobbleEventsOptions {
		return {
			checkFrequency: 0.5,
		};
	}

	protected getLocation(): string {
		return window.location.href;
	}

	startListeners() {
		void this.checkForChanges();
		if (this.parser.onClick) {
			document.addEventListener('click', this.parser.onClick, true);
		}
	}

	stopListeners() {
		if (this.changeListenerId !== null) {
			window.clearTimeout(this.changeListenerId);
			this.changeListenerId = null;
		}
	}

	protected async checkForChanges(): Promise<void> {
		const newUrl = this.getLocation();
		if (this.url !== newUrl) {
			await this.onUrlChange(this.url, newUrl);
			this.url = newUrl;
		}

		const playback = await this.parser.parsePlayback();
		if (playback) {
			const newProgress = playback.progress;
			if (this.progress !== newProgress) {
				await this.updateProgress(newProgress);
				this.progress = newProgress;
			}

			try {
				if (playback.isPaused && !this.isPaused) {
					await this.pause();
				} else if (!playback.isPaused && this.isPaused) {
					await this.start();
				}
			} catch (err) {
				// Do nothing
			}
			this.playbackStarted = true;
			this.isPaused = playback.isPaused;
		} else if (this.playbackStarted) {
			await this.stop();
			this.playbackStarted = false;
			this.isPaused = true;
			this.progress = 0.0;
		}

		this.changeListenerId = window.setTimeout(
			() => void this.checkForChanges(),
			this.options.checkFrequency * 1e3
		);
	}

	protected async onUrlChange(oldUrl: string, newUrl: string): Promise<void> {
		if (!this.parser.options.watchingUrlRegex) {
			return;
		}

		if (this.parser.options.watchingUrlRegex.test(oldUrl)) {
			await this.stop();
			this.playbackStarted = false;
		}

		if (this.parser.options.watchingUrlRegex.test(newUrl)) {
			this.playbackStarted = true;
		}

		this.isPaused = true;
		this.progress = 0.0;
	}

	protected async start(): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_START', null, {});
		await EventDispatcher.dispatch('SCROBBLE_ACTIVE', null, {});
	}

	protected async pause(): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_PAUSE', null, {});
		await EventDispatcher.dispatch('SCROBBLE_INACTIVE', null, {});
	}

	protected async stop(): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_STOP', null, {});
		if (!this.isPaused) {
			await EventDispatcher.dispatch('SCROBBLE_INACTIVE', null, {});
		}
	}

	protected async updateProgress(newProgress: number): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_PROGRESS', null, { progress: newProgress });
	}
}
