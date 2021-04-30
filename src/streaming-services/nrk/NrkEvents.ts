import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { NrkApi } from './NrkApi';

class _ScrobblerTemplateEvents extends ScrobbleEvents {
	progress = 0;
	videoId = '';
	playbackStarted = false;
	url = '';

	checkForChanges = async (): Promise<void> => {
		const player = await NrkApi.getSession();
		if (player) {
			if (this.videoId !== player.mediaItem.id) {
				this.videoId = player.mediaItem.id;
				if (this.playbackStarted) {
					await this.stop();
					this.isPlaying = false;
				}
				if (
					player.playbackStarted &&
					!player.sequenceObserver.isPaused &&
					this.videoId !== undefined
				) {
					await this.start();
					this.isPlaying = true;
				}

				this.isPaused = !this.isPlaying;
				this.playbackStarted = player.playbackStarted;
			} else if (player.playbackStarted) {
				if (player.sequenceObserver.isPaused) {
					if (!this.isPaused) {
						await this.pause();
					}
				} else {
					if (!this.isPlaying) {
						await this.start();
					}
				}
				this.isPaused = player.sequenceObserver.isPaused;
				this.isPlaying = !player.sequenceObserver.isPaused;
				this.playbackStarted = player.playbackStarted;
			}

			if (this.isPlaying) {
				const newProgress = Math.round((player.currentTime / player.duration) * 10000) / 100;
				if (this.progress !== newProgress) {
					await this.updateProgress(newProgress);
					this.progress = newProgress;
				}
			}
		} else {
			const newUrl = this.getLocation();
			if (this.url !== newUrl) {
				await this.stop();
				this.isPlaying = false;
			}
			this.url = newUrl;
		}

		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	};
}

export const NrkEvents = new _ScrobblerTemplateEvents();

registerScrobbleEvents('nrk', NrkEvents);
