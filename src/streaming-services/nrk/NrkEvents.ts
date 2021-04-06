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
					console.warn('new sessinoID', player.mediaItem.id);
					if (this.isPlaying || this.playbackStarted) {
						console.warn('stopping current scrobbling');
						await this.stop();
						this.isPlaying = false;
					}
					if (player.playbackStarted && !player.sequenceObserver.isPaused) {
						console.warn('start new scrobbling');
						await this.start();
						this.isPlaying = true;
					}
					this.videoId = player.mediaItem.id;
					this.isPaused = false;
					this.playbackStarted = player.playbackStarted;
				} else if (player.playbackStarted) {
					if (player.sequenceObserver.isPaused) {
						if (!this.isPaused) {
							console.warn('pause');
							await this.pause();
						}
					} else {
						if (!this.isPlaying) {
							console.warn('start');
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
						if (this.isPlaying) {
							console.warn('will stop');
							await this.stop();
						}
					});
					this.setBeforeUnloadEvent = true;
				}
			} else {
				console.warn('not player 1', player);
			}
		} else {
			console.warn('not player 2', player);
			const newUrl = this.getLocation();
			if (this.url !== newUrl) {
				console.warn('NEW URL!', this.url, '|', newUrl);
				// await this.onUrlChange(this.url, newUrl);
				this.url = newUrl;
			}
			if (this.isPlaying) {
				// const newProgress = NrkParser.parseProgress();
				// if (this.progress === newProgress) {
				// 	if (!this.isPaused) {
				// 		await this.pause();
				// 		this.isPaused = true;
				// 	}
				// } else {
				// 	if (this.isPaused) {
				// 		await this.start();
				// 		this.isPaused = false;
				// 	}
				// 	await this.updateProgress(newProgress);
				// 	this.progress = newProgress;
				// }
			}
		}

		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	};

	onUrlChange = async (oldUrl: string, newUrl: string): Promise<void> => {
		if (oldUrl.includes('avspiller') && newUrl.includes('avspiller')) {
			await this.stop();
			await this.start();
			this.isPlaying = true;
		} else if (oldUrl.includes('avspiller') && !newUrl.includes('avspiller')) {
			await this.stop();
			this.isPlaying = false;
		} else if (!oldUrl.includes('avspiller') && newUrl.includes('avspiller')) {
			console.warn('started, but wrong item?');
			await this.start();
			this.isPlaying = true;
		}
	};
}

export const NrkEvents = new _ScrobblerTemplateEvents();

registerScrobbleEvents('nrk', NrkEvents);
