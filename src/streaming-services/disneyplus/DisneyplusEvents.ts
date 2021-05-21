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
		if(!this.videoId) {
			const item = await DisneyplusParser.parseItem();
			this.videoId = item?.id ?? '';
		}

		if (this.isPlaying) {
			const session = DisneyplusParser.parseSession();

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

			// TODO check progress (dom element doesnt update after disappear)
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
