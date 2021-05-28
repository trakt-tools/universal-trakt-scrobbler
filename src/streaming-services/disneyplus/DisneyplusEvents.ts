import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { DisneyplusParser } from './DisneyplusParser';

class _DisneyplusEvents extends ScrobbleEvents {
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
		// https://www.disneyplus.com/nl-nl/video/f3f11053-d810-4b92-9c95-567bef5f215d
		if (oldUrl.includes('video')) {
			await this.stop();
			this.isPlaying = false;
		}

		if (newUrl.includes('video')) {
			this.videoId = '';
			this.isPlaying = true;
			this.isPaused = true;
		}
	};

	checkForChanges = async (): Promise<void> => {
		const newUrl = this.getLocation();

		if (this.url !== newUrl) {
			await this.onUrlChange(this.url, newUrl);
			this.url = newUrl;
		}
		if (!this.videoId) {
			const item = DisneyplusParser.parseItem();
			this.videoId = item?.id ?? '';
		}
		const session = DisneyplusParser.parseSession();
		if (this.isPlaying && this.videoId) {
			if (this.isPaused !== session.paused) {
				if (session.paused) {
					if (!this.isPaused) {
						await this.pause();
					}
				} else {
					await this.start();
				}
				this.isPaused = session.paused;
			}

			const newProgress = session.progress;
			if (this.progress !== newProgress) {
				await this.updateProgress(newProgress);
				this.progress = newProgress;
			}
		}
		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	};
}

export const DisneyplusEvents = new _DisneyplusEvents();

registerScrobbleEvents('disneyplus', DisneyplusEvents);
