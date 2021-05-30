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

	parseProgress(): number {
		let progress = 0.0;
		const scrubber: HTMLElement | null = document.querySelector('.vjs-play-progress');

		if (scrubber) {
			progress = parseFloat(scrubber?.style.left);
			this.progress = progress;
		}

		return progress;
	}

	parseItem(): Item | undefined {
		const serviceId = 'vrtnu-be';
		let showTitle: string | null = null;
		let seasonOrYear: string | null = null;
		let subTitle: string | undefined = undefined;
		let seasonAndEpisode: string | undefined = undefined;
		let id: string | undefined = undefined;
		let seasonStr: string | undefined = undefined;
		let episodeStr: string | undefined = undefined;

		// https://www.vrt.be/vrtnu/a-z/dertigers/3/dertigers-s3a1/
		// https://www.vrt.be/vrtnu/a-z/une-soeur/2018/une-soeur/
		const matches = /\/a-z\/(.+)\/(.+)\/((.+?)(-s(\d+)a(\d+))?)\//.exec(location.href);

		if (matches) {
			[, showTitle, seasonOrYear, id, subTitle, seasonAndEpisode, seasonStr, episodeStr] = matches;
		}

		const title = showTitle?.split('-').join(' ') ?? '';
		const episodeTitle = '';
		const season = seasonAndEpisode ? parseInt(seasonStr ?? '') : undefined;
		const episode = seasonAndEpisode ? parseInt(episodeStr ?? '') : undefined;
		const type = seasonAndEpisode ? 'show' : 'movie';
		const year = !seasonAndEpisode ? parseInt(seasonOrYear ?? '') : 0;
		const isCollection = false;

		if (id) {
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
	}
}

export const VrtnuBeParser = new _VrtnuBeParser();

registerScrobbleParser('vrtnu-be', VrtnuBeParser);
