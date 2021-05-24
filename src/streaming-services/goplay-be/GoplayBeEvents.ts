import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { GoplayBeParser } from './GoplayBeParser';

class _GoplayBeEvents extends ScrobbleEvents {
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
		// https://www.goplay.be/video/hetisingewikkeld/hetisingewikkeld-s2/hetisingewikkeld-s2-aflevering-1#autoplay
		if (oldUrl.includes('video') && newUrl.includes('video')) {
			await this.stop();
			await this.start();
			this.videoId = '';
			this.isPlaying = true;
		} else if (oldUrl.includes('video') && !newUrl.includes('video')) {
			await this.stop();
			this.videoId = '';
			this.isPlaying = false;
		} else if (!oldUrl.includes('video') && newUrl.includes('video')) {
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
			const item = GoplayBeParser.parseItem();
			this.videoId = item?.id ?? '';
		}

		if (this.isPlaying) {
			const newProgress = GoplayBeParser.parseProgress();
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

export const GoplayBeEvents = new _GoplayBeEvents();

registerScrobbleEvents('goplay-be', GoplayBeEvents);
