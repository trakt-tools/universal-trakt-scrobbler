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
	title: string;
	episodeTitle: string;
	type: string;
	season: number;
	episode: number;
	isCollection: boolean;
	videoId: string;
	progress: number;
	isPaused: boolean;

	constructor() {
		this.id = '';
		this.title = '';
		this.episodeTitle = '';
		this.type = '';
		this.season = 0;
		this.episode = 0;
		this.isCollection = false;
		this.videoId = '';
		this.progress = 0.0;
		this.isPaused = false;
	}

	parseSession = (): DisneyplusSession => {
		const loadingSpinner = document.querySelector('.overlay__loading:not([style="display: none;"])') !== null;
		const pauseIcon = document.querySelector('.pause-icon') !== null;
		const playIcon = document.querySelector('.play-icon') !== null;

		if(loadingSpinner) {
			this.isPaused = true;
		} else if(playIcon && !pauseIcon) {
			this.isPaused = true;
		} else if(pauseIcon && !playIcon) {
			this.isPaused = false;
		}

		const paused = this.isPaused;
		const progress = this.parseProgress();
		return { paused, progress };
	};

	parseProgress = (): number => {
		let progress = 0.0;
		const scrubbers = document.querySelectorAll('.slider-handle-container');
		let scrubber = scrubbers[scrubbers.length- 1];

		if (scrubber) {
			progress = parseFloat(scrubber?.style.width);
			this.progress = progress;
		}
		// Failsafe
		if(progress == 0){
			progress = this.progress;
		}

		return progress;
	};

	parseItem = async (): Promise<Item | undefined> => {
		let item: Item | undefined;

		const serviceId = 'disneyplus';
		const titleElement = document.querySelector('.title-field');
		const subTitleElement = document.querySelector('.subtitle-field');
		const id = location.href.substring(location.href.lastIndexOf('/') + 1);
		const type = subTitleElement?.textContent ? 'show' : 'movie';
		const title = titleElement?.textContent ?? '';
		const subTitle = subTitleElement?.textContent ?? '';
		const year = 0;
		const season = parseInt(subTitle?.substring(1, subTitle.indexOf(':'))) ?? '';
		let parseEpisodeTitle = subTitle?.substring(subTitle.indexOf('.') + 2);
		const episode = parseInt(parseEpisodeTitle?.substring(0, parseEpisodeTitle.indexOf(' '))) ?? '';
		const episodeTitle = parseEpisodeTitle?.substring(parseEpisodeTitle.indexOf(' ') + 1) ?? '';
		const isCollection = episode > 0 ? false : true;

		if(!!titleElement) {
			this.title = title;
			this.episodeTitle = episodeTitle;
			this.type = type;
			this.season = season;
			this.episode = episode;
			this.isCollection = isCollection;
			this.videoId = id;
		} else {
			return undefined;
		}

		item = new Item({ serviceId, id, type, title, year, episodeTitle, season, episode, isCollection });

		return item;
	};

}

export const DisneyplusParser = new _DisneyplusParser();

registerScrobbleParser('disneyplus', DisneyplusParser);
