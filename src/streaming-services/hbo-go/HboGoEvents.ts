import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { HboGoApi } from './HboGoApi';
import { HboGoParser } from './HboGoParser';

class _HboGoEvents extends ScrobbleEvents {
	progress: number;
	url: string;
	videoId: string;

	constructor() {
		super();

		this.progress = 0.0;
		this.url = '';
		this.videoId = '';
	}

	checkForChanges = async (): Promise<void> => {
		// If we can access the global sdk object from the page, there is no need to parse the page in order to retrieve information about the item being watched.
		let session = await HboGoApi.getSession();
		if (typeof session === 'undefined') {
			session = HboGoParser.parseSession();
		}
		if (session) {
			if (this.videoId !== session.content.Id) {
				if (this.isPlaying) {
					await this.stop();
				}
				await this.start();
				this.videoId = session.content.Id;
				this.isPaused = false;
				this.isPlaying = true;
			} else if (this.isPaused !== session.paused || this.isPlaying !== session.playing) {
				if (session.paused) {
					if (!this.isPaused) {
						await this.pause();
					}
				} else if (session.playing) {
					if (!this.isPlaying) {
						await this.start();
					}
				} else if (this.isPlaying) {
					await this.stop();
				}
				this.isPaused = session.paused;
				this.isPlaying = session.playing;
			}
			if (this.isPlaying) {
				const newProgress = session.progress;
				if (this.progress !== newProgress) {
					await this.updateProgress(newProgress);
					this.progress = newProgress;
				}
			}
		} else if (this.isPlaying || this.isPaused) {
			await this.stop();
		}
		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	};
}

export const HboGoEvents = new _HboGoEvents();

registerScrobbleEvents('hbo-go', HboGoEvents);
