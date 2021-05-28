import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';

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
		this.isPaused = true;
	}

	getVideoElement = (): HTMLVideoElement => {
		return document.getElementsByTagName('video')[0];
	};

	parseSession = (): DisneyplusSession => {
		const videoPlayer = this.getVideoElement();

		if (videoPlayer?.duration) {
			this.isPaused = videoPlayer.paused;
			this.progress = Math.round((videoPlayer.currentTime / videoPlayer.duration) * 10000) / 100;
		}
		return { paused: this.isPaused, progress: this.progress };
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
