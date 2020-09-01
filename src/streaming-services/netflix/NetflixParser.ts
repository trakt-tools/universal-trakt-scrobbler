import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { NetflixApi } from './NetflixApi';

class _NetflixParser implements ScrobbleParser {
	getLocation = (): string => {
		return window.location.href;
	};

	parseItem = (): Promise<Item | undefined> => {
		return new Promise((resolve) => void this.checkId(resolve));
	};

	parseProgress = (): number => {
		let progress = 0.0;
		const scrubber: HTMLElement | null = document.querySelector('.scrubber-bar .current-progress');
		if (scrubber) {
			progress = parseFloat(scrubber.style.width);
		}
		return progress;
	};

	checkId = async (callback: (item: Item | undefined) => void): Promise<void> => {
		const id = await this.getId();
		if (id) {
			const item = await NetflixApi.getItem(id);
			callback(item);
		} else {
			setTimeout(() => void this.checkId(callback), 500);
		}
	};

	getId = async (): Promise<string | null> => {
		// If we can access the global netflix object from the page, there is no need to parse the page in order to retrieve the ID of the item being watched.
		let id: string | null = null;
		const session = await NetflixApi.getSession();
		if (session) {
			id = session.videoId.toString();
		} else {
			const matches = /watch\/(\d+)/.exec(this.getLocation());
			if (matches) {
				[, id] = matches;
			}
		}
		return id;
	};
}

export const NetflixParser = new _NetflixParser();

registerScrobbleParser('netflix', NetflixParser);
