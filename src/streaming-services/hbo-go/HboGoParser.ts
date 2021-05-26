import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { HboGoApi, HboGoSession } from './HboGoApi';

class _HboGoParser implements ScrobbleParser {
	id: string;

	constructor() {
		this.id = '';
	}

	parseItem = async (): Promise<Item | undefined> => {
		const session = await HboGoApi.getSession();
		const id = session?.videoId || this.id;
		const item = id ? await HboGoApi.getItem(id) : undefined;
		return item;
	};

	parseSession = (): HboGoSession => {
		const [progress, progressMs] = this.parseProgress();
		return { videoId: '', progress, progressMs };
	};

	parseProgress = (): [number, number] => {
		let progress = 0.0;
		let progressMs = 0.0;
		const scrubber: HTMLElement | null = document.querySelector('.timelineProgress');
		if (scrubber) {
			progress = parseFloat(scrubber.style.width);
		}
		const scrubberMs: HTMLElement | null = document.querySelector('.currentTime');
		if (scrubberMs) {
			progressMs = parseInt(scrubberMs.textContent?.replace(/:/g, '') ?? '0');
		}
		return [progress, progressMs];
	};
}

export const HboGoParser = new _HboGoParser();

registerScrobbleParser('hbo-go', HboGoParser);
