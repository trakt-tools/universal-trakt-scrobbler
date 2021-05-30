import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { StreamzBeApi } from './StreamzBeApi';

export interface StreamzBeSession {
	paused: boolean;
	progress: number;
}

class _StreamzBeParser implements ScrobbleParser {
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

	parseProgress(): number {
		let progress = 0.0;
		const scrubber: HTMLElement | null = document.querySelector('.pui__seekbar__scrubber');

		if (scrubber) {
			progress = parseFloat(scrubber?.style.left);
			this.progress = progress;
		}

		return progress;
	}

	parseItem(): Item | undefined {
		const serviceId = 'streamz-be';
		const titleElement = document.querySelector('.player__title');
		const id = location.href.substring(location.href.lastIndexOf('/') + 1);
		let showTitle: string | null = null;
		let seasonId: string | null = null;
		let episodeId: string | null = null;
		let subTitle: string | undefined = undefined;

		// Shows get a title like this (dutch example): "Raised by Wolves S1 A1 Aflevering 1"
		const matches = /(.+) S(\d+) A(\d+) (.+)/.exec(titleElement?.textContent ?? '');

		if (matches) {
			[, showTitle, seasonId, episodeId, subTitle] = matches;
		}

		const title = showTitle ?? titleElement?.textContent ?? '';
		const episodeTitle = subTitle ?? '';
		const season = parseInt(seasonId ?? '') || 0;
		const episode = parseInt(episodeId ?? '') || 0;
		const type = seasonId ? 'show' : 'movie';
		const isCollection = false;

		if (titleElement) {
			this.videoId = id;
		} else {
			return undefined;
		}

		return new Item({
			serviceId,
			id,
			type,
			title,
			episodeTitle,
			season,
			episode,
			isCollection,
		});
	}
}

export const StreamzBeParser = new _StreamzBeParser();

registerScrobbleParser('streamz-be', StreamzBeParser);
