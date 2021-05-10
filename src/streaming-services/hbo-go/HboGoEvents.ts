import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { HboGoApi } from './HboGoApi';
import { HboGoParser } from './HboGoParser';

class _HboGoEvents extends ScrobbleEvents {
	progress: number;
	progressMs: number;
	url: string;
	videoId: string;

	constructor() {
		super();

		this.progress = 0.0;
		this.progressMs = 0.0;
		this.url = '';
		this.videoId = '';
	}

	startListeners = () => {
		this.addChangeListener();
		document.body.addEventListener('click', (event) => void this.onClick(event), true);
	};

	onClick = async (event: Event) => {
		const target: HTMLElement = event.target as HTMLElement;
		const playButton: HTMLElement | null = target.matches(
			'.buttonComponent.play, [href*="/content/"]'
		)
			? target
			: target.closest('.buttonComponent.play, [href*="/content/"]');
		if (playButton) {
			const videoId = (playButton.getAttribute('href') || window.location.pathname).split(
				'/content/'
			)[1];
			if (videoId && videoId !== this.videoId) {
				if (this.isPlaying) {
					await this.stop();
				}
				this.videoId = videoId;
				HboGoParser.id = this.videoId;
			}
		}
	};

	checkForChanges = async (): Promise<void> => {
		// If we can access the global sdk object from the page, there is no need to parse the page in order to retrieve information about the item being watched.
		const session = await HboGoApi.getSession();
		if (typeof session !== 'undefined') {
			if (session) {
				const paused = this.progressMs === session.progressMs;
				const playing = !paused;
				this.progressMs = session.progressMs;
				if (this.videoId !== session.videoId) {
					if (this.isPlaying) {
						await this.stop();
					}
					await this.start();
					this.videoId = session.videoId;
					this.isPaused = false;
					this.isPlaying = true;
				} else if (this.isPaused !== paused || this.isPlaying !== playing) {
					if (paused) {
						if (!this.isPaused) {
							await this.pause();
						}
					} else if (playing) {
						if (!this.isPlaying) {
							await this.start();
						}
					} else if (this.isPlaying) {
						await this.stop();
					}
					this.isPaused = paused;
					this.isPlaying = playing;
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
		} else if (this.videoId) {
			const session = HboGoParser.parseSession();
			const paused = this.progressMs > 0 && this.progressMs === session.progressMs;
			const playing = this.progressMs > 0 && this.progressMs !== session.progressMs;
			this.progressMs = session.progressMs;
			if (this.isPaused !== paused || this.isPlaying !== playing) {
				if (paused) {
					if (!this.isPaused) {
						await this.pause();
					}
				} else if (playing) {
					if (!this.isPlaying) {
						await this.start();
					}
				} else if (this.isPlaying) {
					await this.stop();
					this.videoId = '';
					HboGoParser.id = '';
				}
				this.isPaused = paused;
				this.isPlaying = playing;
			}
			if (this.isPlaying) {
				const newProgress = session.progress;
				if (this.progress !== newProgress) {
					await this.updateProgress(newProgress);
					this.progress = newProgress;
				}
			}
		}
		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 2000);
	};
}

export const HboGoEvents = new _HboGoEvents();

registerScrobbleEvents('hbo-go', HboGoEvents);
