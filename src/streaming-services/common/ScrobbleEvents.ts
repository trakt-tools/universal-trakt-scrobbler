import { EventDispatcher } from '../../common/Events';

export abstract class ScrobbleEvents {
	changeListenerId: number | null;
	isPaused: boolean;
	isPlaying: boolean;

	constructor() {
		this.changeListenerId = null;
		this.isPaused = false;
		this.isPlaying = false;
	}

	startListeners() {
		void this.checkForChanges();
	}

	stopListeners() {
		if (this.changeListenerId !== null) {
			window.clearTimeout(this.changeListenerId);
			this.changeListenerId = null;
		}
	}

	getLocation(): string {
		return window.location.href;
	}

	abstract checkForChanges(): Promise<void>;

	async start(): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_START', null, {});
		await EventDispatcher.dispatch('SCROBBLE_ACTIVE', null, {});
	}

	async pause(): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_PAUSE', null, {});
		await EventDispatcher.dispatch('SCROBBLE_INACTIVE', null, {});
	}

	async stop(): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_STOP', null, {});
		if (!this.isPaused) {
			await EventDispatcher.dispatch('SCROBBLE_INACTIVE', null, {});
		}
	}

	async updateProgress(newProgress: number): Promise<void> {
		await EventDispatcher.dispatch('SCROBBLE_PROGRESS', null, { progress: newProgress });
	}
}
