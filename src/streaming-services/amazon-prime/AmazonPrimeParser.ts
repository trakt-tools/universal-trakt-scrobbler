import { Item } from '../../models/Item';
import { AmazonPrimeApi } from './AmazonPrimeApi';
import { ScrobbleParser } from '../common/ScrobbleController';
import { registerScrobbleParser } from '../common/common';

export interface AmazonPrimeSession {
	playing: boolean;
	paused: boolean;
	progress: number;
}

class _AmazonPrimeParser implements ScrobbleParser {
	id: string;

	constructor() {
		this.id = '';
	}

	parseItem = async (): Promise<Item | undefined> => {
		const item = this.id ? await AmazonPrimeApi.getItem(this.id) : undefined;
		return item;
	};

	parseSession = (): AmazonPrimeSession => {
		const loadingSpinner = document.querySelector('.loadingSpinner:not([style="display: none;"])');
		const playing = !!loadingSpinner || !!document.querySelector('.pausedIcon');
		const paused = !!document.querySelector('.playIcon');
		const progress = this.parseProgress();
		return { playing, paused, progress };
	};

	parseProgress = (): number => {
		let progress = 0.0;
		const scrubber: HTMLElement | null = document.querySelector('.positionBar:not(.vertical)');
		if (scrubber) {
			progress = parseFloat(scrubber.style.width);
		}
		return progress;
	};
}

export const AmazonPrimeParser = new _AmazonPrimeParser();

registerScrobbleParser('amazon-prime', AmazonPrimeParser);
