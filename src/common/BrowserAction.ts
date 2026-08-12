import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import browser, { Action as WebExtAction } from 'webextension-polyfill';

export interface BrowserActionRotating {
	image: ImageBitmap | null;
	canvas: OffscreenCanvas | null;
	context: OffscreenCanvasRenderingContext2D | null;
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
				// Only swap the image being rotated - restarting the rotation here would
				// clear a pending cancellation and could leave the icon spinning forever.
				await this.updateRotatingIcon();
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
				// Only swap the image being rotated - restarting the rotation here would
				// clear a pending cancellation and could leave the icon spinning forever.
				await this.updateRotatingIcon();
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
			const image = await this.createIconBitmap();
			const canvas = new OffscreenCanvas(image.width, image.height);
			const context = canvas.getContext('2d', {
				willReadFrequently: true,
			}) as OffscreenCanvasRenderingContext2D;
			this.rotating = {
				image,
				canvas,
				context,
				degrees: 0,
				canceled: false,
			};
			await this.rotateIcon(this.rotating);
		} else {
			await Messaging.toExtension({ action: 'set-rotating-icon' });
		}
	}

	private async createIconBitmap(): Promise<ImageBitmap> {
		const imageResponse = await Requests.fetch({
			method: 'GET',
			url: this.currentIcon,
		});
		const imageBlob = await imageResponse.blob();
		return createImageBitmap(imageBlob);
	}

	private async updateRotatingIcon(): Promise<void> {
		const rotating = this.rotating;
		if (!rotating) {
			return;
		}
		const icon = this.currentIcon;
		const image = await this.createIconBitmap();
		// The rotation may have been replaced or stopped, or the icon may have changed again,
		// while the image was loading - in that case the loaded bitmap is stale
		if (this.rotating === rotating && this.currentIcon === icon) {
			rotating.image = image;
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

	async rotateIcon(rotating: BrowserActionRotating): Promise<void> {
		if (this.rotating !== rotating) {
			// A newer rotation has taken over, so let it drive the icon instead
			return;
		}

		if (rotating.canceled) {
			// Restore the static icon - otherwise it would remain stuck on the last rotated frame
			this.rotating = null;
			await this.instance.setIcon({
				path: this.currentIcon,
			});
			return;
		}

		const { image, canvas, context, degrees } = rotating;
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

		rotating.degrees = (rotating.degrees + 15) % 360;

		setTimeout(() => void this.rotateIcon(rotating), 30);
	}
}

export const BrowserAction = new _BrowserAction();
