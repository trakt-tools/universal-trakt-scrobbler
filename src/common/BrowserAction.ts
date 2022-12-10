import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import browser, { Action as WebExtAction } from 'webextension-polyfill';

export interface BrowserActionRotating {
	image: HTMLImageElement | null;
	canvas: HTMLCanvasElement | null;
	context: CanvasRenderingContext2D | null;
	degrees: number;
	canceled: boolean;
}

class _BrowserAction {
	instance = Shared.manifestVersion === 3 ? browser.action : browser.browserAction;
	currentIcon = browser.runtime.getURL('images/uts-icon-38.png');
	rotating: BrowserActionRotating | null = null;

	init() {
		Shared.events.subscribe('SCROBBLE_START', null, this.onScrobbleActive);
		Shared.events.subscribe('SCROBBLE_PAUSE', null, this.onScrobbleInactive);
		Shared.events.subscribe('SCROBBLE_STOP', null, this.onScrobbleInactive);
	}

	onScrobbleActive = () => {
		void this.setActiveIcon();
	};

	onScrobbleInactive = () => {
		void this.setInactiveIcon();
	};

	async setTitle(title = 'Universal Trakt Scrobbler'): Promise<void> {
		if (Shared.pageType === 'background') {
			await this.instance.setTitle({ title });
		} else {
			await Messaging.toExtension({ action: 'set-title', title });
		}
	}

	async setActiveIcon(): Promise<void> {
		if (Shared.pageType === 'background') {
			this.currentIcon = browser.runtime.getURL('images/uts-icon-selected-38.png');
			if (this.rotating) {
				await this.setStaticIcon();
				await this.setRotatingIcon();
			} else {
				await this.instance.setIcon({
					path: this.currentIcon,
				});
			}
		} else {
			await Messaging.toExtension({ action: 'set-active-icon' });
		}
	}

	async setInactiveIcon(): Promise<void> {
		if (Shared.pageType === 'background') {
			this.currentIcon = browser.runtime.getURL('images/uts-icon-38.png');
			if (this.rotating) {
				await this.setStaticIcon();
				await this.setRotatingIcon();
			} else {
				await this.instance.setIcon({
					path: this.currentIcon,
				});
			}
		} else {
			await Messaging.toExtension({ action: 'set-inactive-icon' });
		}
	}

	async setRotatingIcon(): Promise<void> {
		if (Shared.pageType === 'background') {
			const image = document.createElement('img');
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			this.rotating = {
				image,
				canvas,
				context,
				degrees: 0,
				canceled: false,
			};
			image.onload = () => void this.rotateIcon();
			image.src = this.currentIcon;
		} else {
			await Messaging.toExtension({ action: 'set-rotating-icon' });
		}
	}

	async setStaticIcon(): Promise<void> {
		if (Shared.pageType === 'background') {
			if (this.rotating) {
				this.rotating.canceled = true;
			}
		} else {
			await Messaging.toExtension({ action: 'set-static-icon' });
		}
	}

	async rotateIcon(): Promise<void> {
		if (!this.rotating) {
			return;
		}

		const { image, canvas, context, degrees } = this.rotating;
		if (!image || !canvas || !context) {
			return;
		}

		canvas.width = image.width;
		canvas.height = image.height;
		context.clearRect(0, 0, image.width, image.height);
		context.translate(image.width / 2, image.height / 2);
		context.rotate((degrees * Math.PI) / 180);
		context.drawImage(image, -(image.width / 2), -(image.height / 2));

		await this.instance.setIcon({
			imageData: context.getImageData(
				0,
				0,
				image.width,
				image.height
			) as WebExtAction.ImageDataType,
		});

		this.rotating.degrees += 15;
		if (this.rotating.degrees >= 360) {
			if (this.rotating.canceled) {
				this.rotating = null;
				return;
			}

			this.rotating.degrees = 0;
		}

		window.setTimeout(() => void this.rotateIcon(), 30);
	}
}

export const BrowserAction = new _BrowserAction();
