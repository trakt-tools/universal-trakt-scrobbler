import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleParser';
import { AmazonPrimeApi } from './AmazonPrimeApi';

class _AmazonPrimeParser extends ScrobbleParser {
	itemId = '';

	constructor() {
		super(AmazonPrimeApi, {
			videoPlayerSelector: '.dv-player-fullscreen video:not(.tst-video-overlay-player-html5)',
		});
	}

	onClick = (event: Event) => {
		const targetElement = event.target as HTMLElement | null;
		if (!targetElement) {
			return;
		}

		const selector = '[data-asin], #dv-action-box-wrapper';
		const playButton: HTMLElement | null = targetElement.matches(selector)
			? targetElement
			: targetElement.closest(selector);
		if (!playButton) {
			return;
		}

		const itemId =
			playButton.dataset.asin ||
			playButton.querySelector<HTMLInputElement>('[name="titleId"]')?.value;
		if (itemId && itemId !== this.itemId) {
			this.itemId = itemId;
		}
	};

	async parseItemFromApi() {
		const item = await super.parseItemFromApi();
		if (item) {
			// Get the next item ID in case the user plays the next episode
			this.itemId = AmazonPrimeApi.nextItemId;
		}
		return item;
	}

	parseItemIdFromCustom() {
		return this.itemId;
	}
}

export const AmazonPrimeParser = new _AmazonPrimeParser();

registerScrobbleParser('amazon-prime', AmazonPrimeParser);
