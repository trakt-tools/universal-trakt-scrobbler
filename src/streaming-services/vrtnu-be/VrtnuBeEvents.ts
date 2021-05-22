import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { VrtnuBeParser } from './VrtnuBeParser';

class _VrtnuBeEvents extends ScrobbleEvents {
	progress: number;
	url: string;
	videoId: string;

	constructor() {
		super();

		this.progress = 0.0;
		this.url = '';
		this.videoId = '';
	}

	onUrlChange = async (oldUrl: string, newUrl: string): Promise<void> => {
		// Todo cleanup this code - no api available atm
		const regx = /\/a-z\/(.+)\/(.+)\/(.+)\//;
		const oldUrlMatch = regx.test(oldUrl);
		const newUrlMatch = regx.test(oldUrl);

		if (oldUrlMatch && newUrlMatch) {
			await this.stop();
			await this.start();
			this.videoId = '';
			this.isPlaying = true;
		} else if (oldUrlMatch && !newUrlMatch) {
			await this.stop();
			this.videoId = '';
			this.isPlaying = false;
		} else if (!oldUrlMatch && newUrlMatch) {
			await this.start();
			this.videoId = '';
			this.isPlaying = true;
		}
	};

	checkForChanges = async (): Promise<void> => {
		const newUrl = this.getLocation();

		if (this.url !== newUrl) {
			await this.onUrlChange(this.url, newUrl);
			this.url = newUrl;
		}
		if (!this.videoId) {
			const item = VrtnuBeParser.parseItem();
			this.videoId = item?.id ?? '';
		}

		if (this.isPlaying) {
			const newProgress = VrtnuBeParser.parseProgress();
			if (this.progress === newProgress) {
				if (!this.isPaused) {
					await this.pause();
					this.isPaused = true;
				}
			} else {
				if (this.isPaused) {
					await this.start();
					this.isPaused = false;
				}
				await this.updateProgress(newProgress);
				this.progress = newProgress;
			}
		}
		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	};
}

export const VrtnuBeEvents = new _VrtnuBeEvents();

registerScrobbleEvents('vrtnu-be', VrtnuBeEvents);
