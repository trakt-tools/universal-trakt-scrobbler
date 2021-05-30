import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { NetflixApi } from './NetflixApi';
import { NetflixParser } from './NetflixParser';

class _NetflixEvents extends ScrobbleEvents {
	progress: number;
	url: string;
	videoId: number;

	constructor() {
		super();

		this.progress = 0.0;
		this.url = '';
		this.videoId = 0;
	}

	async checkForChanges(): Promise<void> {
		// If we can access the global netflix object from the page, there is no need to parse the page in order to retrieve information about the item being watched.
		const session = await NetflixApi.getSession();
		if (typeof session !== 'undefined') {
			if (session) {
				if (this.videoId !== session.videoId) {
					if (this.isPlaying) {
						await this.stop();
					}
					await this.start();
					this.videoId = session.videoId;
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
					const newProgress = Math.round((session.currentTime / session.duration) * 10000) / 100;
					if (this.progress !== newProgress) {
						await this.updateProgress(newProgress);
						this.progress = newProgress;
					}
				}
			} else if (this.isPlaying || this.isPaused) {
				await this.stop();
			}
		} else {
			const newUrl = this.getLocation();
			if (this.url !== newUrl) {
				await this.onUrlChange(this.url, newUrl);
				this.url = newUrl;
			}
			if (this.isPlaying) {
				const newProgress = NetflixParser.parseProgress();
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
		}
		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	}

	async onUrlChange(oldUrl: string, newUrl: string): Promise<void> {
		if (oldUrl.includes('watch') && newUrl.includes('watch')) {
			await this.stop();
			await this.start();
			this.isPlaying = true;
		} else if (oldUrl.includes('watch') && !newUrl.includes('watch')) {
			await this.stop();
			this.isPlaying = false;
		} else if (!oldUrl.includes('watch') && newUrl.includes('watch')) {
			await this.start();
			this.isPlaying = true;
		}
	}
}

export const NetflixEvents = new _NetflixEvents();

registerScrobbleEvents('netflix', NetflixEvents);
