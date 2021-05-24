import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { StreamzBeParser } from './StreamzBeParser';

class _StreamzBeEvents extends ScrobbleEvents {
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
		// https://www.streamz.be/streamz/afspelen/e870cbdf1-77f7-4b06-8dce-2437686eb096
		if (oldUrl.includes('afspelen') && newUrl.includes('afspelen')) {
			await this.stop();
			await this.start();
			this.videoId = '';
			this.isPlaying = true;
		} else if (oldUrl.includes('afspelen') && !newUrl.includes('afspelen')) {
			await this.stop();
			this.videoId = '';
			this.isPlaying = false;
		} else if (!oldUrl.includes('afspelen') && newUrl.includes('afspelen')) {
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
			const item = StreamzBeParser.parseItem();
			this.videoId = item?.id ?? '';
		}

		if (this.isPlaying) {
			const newProgress = StreamzBeParser.parseProgress();
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

export const StreamzBeEvents = new _StreamzBeEvents();

registerScrobbleEvents('streamz-be', StreamzBeEvents);
