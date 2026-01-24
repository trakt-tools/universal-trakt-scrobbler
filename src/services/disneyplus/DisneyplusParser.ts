import { DisneyplusApi } from '@/disneyplus/DisneyplusApi';
import { ScrobbleParser, ScrobblePlayback } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _DisneyplusParser extends ScrobbleParser {
	constructor() {
		super(DisneyplusApi, {
			watchingUrlRegex: /\/play\/(?<id>.+)/, // https://www.disneyplus.com/nl-nl/play/f3f11053-d810-4b92-9c95-567bef5f215d => f3f11053-d810-4b92-9c95-567bef5f215d
		});
	}

	parsePlaybackFromDom(): Partial<ScrobblePlayback> | null {
		const progressBarElement = document.querySelector('progress-bar');
		if (!progressBarElement || !progressBarElement.shadowRoot) {
			return null;
		}

		const progressWithInfo = progressBarElement.shadowRoot.querySelector('div.progress-bar__thumb');
		if (!progressWithInfo) {
			return null;
		}

		let paused = false;
		const togglePause = document.querySelector('toggle-play-pause');
		if (togglePause) {
			const button = togglePause.shadowRoot?.querySelector('button');
			// If there is button with class pause-button control == playing
			if (button) {
				if (button.className.includes('play-button')) {
					paused = true;
				} else if (button.className.includes('pause-button')) {
					paused = false;
				}
			}
		}

		return {
			progress:
				(Number(progressWithInfo.ariaValueNow) / Number(progressWithInfo.ariaValueMax)) * 100.0,
			isPaused: paused,
		};
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const titleElement = document.querySelector('.title-field');

		if (!titleElement) {
			return null;
		}

		const title = titleElement?.textContent ?? '';
		const subTitleElement = document.querySelector('.subtitle-field');

		let seasonAndEpisode: string | null = null;
		let seasonStr: string | null = null;
		let episodeStr: string | null = null;
		let subTitle: string | undefined = undefined;

		// Shows get a subtitle like this (dutch example): "S1: afl. 6 One World, One People"
		const matches =
			/(?<seasonAndEpisode>.+?(?<seasonStr>\d+).+?(?<episodeStr>\d+) )?(?<subTitle>.+)/.exec(
				subTitleElement?.textContent ?? ''
			);

		if (matches?.groups) {
			({ seasonAndEpisode, seasonStr, episodeStr, subTitle } = matches.groups);
		}

		if (seasonAndEpisode) {
			const episodeTitle = subTitle ?? '';
			const season = parseInt(seasonStr ?? '') || 0;
			const number = parseInt(episodeStr ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
				season,
				number,
				show: {
					serviceId,
					title,
				},
			});
		}

		return new MovieItem({
			serviceId,
			id,
			title,
		});
	}
}

export const DisneyplusParser = new _DisneyplusParser();
