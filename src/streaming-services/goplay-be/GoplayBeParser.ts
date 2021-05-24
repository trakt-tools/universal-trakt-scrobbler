import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { GoplayBeApi } from './GoplayBeApi';

export interface GoplayBeSession {
	paused: boolean;
	progress: number;
}

class _GoplayBeParser implements ScrobbleParser {
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
			progress = parseFloat(scrubber?.style.width);
			this.progress = progress;
		}

		return progress;
	};

	parseItem = (): Item | undefined => {
		const serviceId = 'goplay-be';
		const titleElement = document.querySelector('title');
		const id = location.href.substring(location.href.lastIndexOf('/') + 1);
		const year = 0;
		let showTitle: string | null = null;
		let seasonId: string | null = null;
		let episodeId: string | null = null;

		// Shows get a title like this (dutch example): "#hetisingewikkeld - S2 - Aflevering 1"
		const matches = /(.+) - S(\d+) - Aflevering (\d+)/.exec(titleElement?.textContent ?? '');

		if (matches) {
			[, showTitle, seasonId, episodeId] = matches;
		}

		const title = showTitle ?? titleElement?.textContent ?? '';
		const episodeTitle = '';
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
			year,
			episodeTitle,
			season,
			episode,
			isCollection,
		});
	};
}

export const GoplayBeParser = new _GoplayBeParser();

registerScrobbleParser('goplay-be', GoplayBeParser);
