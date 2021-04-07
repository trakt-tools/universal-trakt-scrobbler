import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { NrkApi } from './NrkApi';

class _ScrobblerTemplateEvents extends ScrobbleEvents {
	progress = 0;
	videoId = '';
	playbackStarted = false;
	url = '';
	setBeforeUnloadEvent = false;

	checkForChanges = async (): Promise<void> => {
		const player = await NrkApi.getSession();
		if (typeof player !== 'undefined') {
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
				if (!this.setBeforeUnloadEvent) {
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					window.addEventListener('beforeunload', async () => {
						if (this.playbackStarted) {
							await this.stop();
						}
					});
					this.setBeforeUnloadEvent = true;
				}
			}
		}

		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	};
}

export const NrkEvents = new _ScrobblerTemplateEvents();

registerScrobbleEvents('nrk', NrkEvents);
