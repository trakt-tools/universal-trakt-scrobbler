import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { DisneyplusApi } from './DisneyplusApi';

// TODO Cleanup

export interface DisneyplusSession {
	paused: boolean;
	progress: number;
}

class _DisneyplusParser implements ScrobbleParser {
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

	parseSession = (): DisneyplusSession => {
		const loadingSpinner =
			document.querySelector('.overlay__loading:not([style="display: none;"])') !== null;
		const pauseIcon = document.querySelector('.pause-icon') !== null;
		const playIcon = document.querySelector('.play-icon') !== null;

		if (loadingSpinner) {
			this.isPaused = true;
		} else if (playIcon && !pauseIcon) {
			this.isPaused = true;
		} else if (pauseIcon && !playIcon) {
			this.isPaused = false;
		}

		const paused = this.isPaused;
		const progress = this.parseProgress();
		return { paused, progress };
	};

	parseProgress = (): number => {
		let progress = 0.0;
		const scrubbers: NodeListOf<HTMLElement> = document.querySelectorAll(
			'.slider-handle-container'
		);
		const scrubber = scrubbers[scrubbers.length - 1];

		if (scrubber) {
			progress = parseFloat(scrubber?.style.width);
			this.progress = progress;
		}
		// Failsafe
		if (progress == 0) {
			progress = this.progress;
		}
		return progress;
	};

	parseItem = (): Item | undefined => {
		const serviceId = 'disneyplus';
		const id = location.href.substring(location.href.lastIndexOf('/') + 1);
		const titleElement = document.querySelector('.title-field');
		const title = titleElement?.textContent ?? '';
		const subTitleElement = document.querySelector('.subtitle-field');
		const type = subTitleElement?.textContent ? 'show' : 'movie';

		let seasonAndEpisode: string | null = null;
		let seasonStr: string | null = null;
		let episodeStr: string | null = null;
		let subTitle: string | undefined = undefined;

		// Shows get a subtitle like this (dutch example): "S1: afl. 6 One World, One People"
		const matches = /(.+?(\d+).+?(\d+) )?(.+)/.exec(subTitleElement?.textContent ?? '');

		if (matches) {
			[, seasonAndEpisode, seasonStr, episodeStr, subTitle] = matches;
		}

		const year = 0;
		const season = seasonAndEpisode ? parseInt(seasonStr ?? '') : undefined;
		const episode = seasonAndEpisode ? parseInt(episodeStr ?? '') : undefined;
		const episodeTitle = subTitle ?? '';
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

export const DisneyplusParser = new _DisneyplusParser();

registerScrobbleParser('disneyplus', DisneyplusParser);
