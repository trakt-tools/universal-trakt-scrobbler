import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { VrtnuBeApi } from './VrtnuBeApi';

class _VrtnuBeParser implements ScrobbleParser {
	id: string;
	videoId: string;
	progress: number;
	isPaused: boolean;

	constructor() {
		this.id = '';
		this.videoId = '';
		this.progress = 0.0;
		this.isPaused = false;
	}

	parseProgress = (): number => {
		let progress = 0.0;
		const scrubber: HTMLElement | null = document.querySelector('.vjs-play-progress');

		if (scrubber) {
			progress = parseFloat(scrubber?.style.left);
			this.progress = progress;
		}

		return progress;
	};

	parseItem = (): Item | undefined => {
		const serviceId = 'vrtnu-be';
		let showTitle: string | null = null;
		let seasonOrYear: string | null = null;
		let subTitle: string | undefined = undefined;
		const matches = /\/a-z\/(.+)\/(.+)\/(.+)\//.exec(location.href);

		if (matches) {
			[, showTitle, seasonOrYear, subTitle] = matches;
		}

		const id = subTitle ?? '';
		const title = showTitle ?? '';
		const episodeTitle = '';
		const episodeId = subTitle?.substring(subTitle?.lastIndexOf('s' + seasonOrYear + 'a')) ?? '';
		const type = episodeId ? 'show' : 'movie';
		const season = type == 'show' ? parseInt(seasonOrYear ?? '') || 0 : 0;
		const episode = type == 'show' ? parseInt(episodeId ?? '') || 0 : 0;
		const year = type == 'movie' ? parseInt(seasonOrYear ?? '') : 0;
		const isCollection = false;

		if (showTitle) {
			this.videoId = id;
		} else {
			return undefined;
		}

		return new Item({
			serviceId,
			id,
			type,
			title,
			year,
			episodeTitle,
			season,
			episode,
			isCollection,
		});
	};
}

export const VrtnuBeParser = new _VrtnuBeParser();

registerScrobbleParser('vrtnu-be', VrtnuBeParser);
