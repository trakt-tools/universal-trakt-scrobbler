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

	startListeners = () => {
		this.addChangeListener();
	};

	stopListeners = () => {
		this.stopChangeListener();
	};

	getLocation = (): string => {
		return window.location.href;
	};

	addChangeListener = () => {
		void this.checkForChanges();
	};

	stopChangeListener = () => {
		if (this.changeListenerId !== null) {
			window.clearTimeout(this.changeListenerId);
		}
		this.changeListenerId = null;
	};

	abstract checkForChanges(): Promise<void>;

	start = async (): Promise<void> => {
		await EventDispatcher.dispatch('SCROBBLE_START', null, {});
		await EventDispatcher.dispatch('SCROBBLE_ACTIVE', null, {});
	};

	pause = async (): Promise<void> => {
		await EventDispatcher.dispatch('SCROBBLE_PAUSE', null, {});
		await EventDispatcher.dispatch('SCROBBLE_INACTIVE', null, {});
	};

	stop = async (): Promise<void> => {
		await EventDispatcher.dispatch('SCROBBLE_STOP', null, {});
		if (!this.isPaused) {
			await EventDispatcher.dispatch('SCROBBLE_INACTIVE', null, {});
		}
	};

	updateProgress = async (newProgress: number): Promise<void> => {
		await EventDispatcher.dispatch('SCROBBLE_PROGRESS', null, { progress: newProgress });
	};
}
