import { DisneyplusApi } from '@/disneyplus/DisneyplusApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { Item } from '@models/Item';

class _DisneyplusParser extends ScrobbleParser {
	constructor() {
		super(DisneyplusApi, {
			watchingUrlRegex: /\/video\/(?<id>.+)/, // https://www.disneyplus.com/nl-nl/video/f3f11053-d810-4b92-9c95-567bef5f215d => f3f11053-d810-4b92-9c95-567bef5f215d
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const titleElement = document.querySelector('.title-field');
		const title = titleElement?.textContent ?? '';
		const subTitleElement = document.querySelector('.subtitle-field');
		const type = subTitleElement?.textContent ? 'show' : 'movie';

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

		const season = seasonAndEpisode ? parseInt(seasonStr ?? '') : undefined;
		const episode = seasonAndEpisode ? parseInt(episodeStr ?? '') : undefined;
		const episodeTitle = subTitle ?? '';

		if (!titleElement) {
			return null;
		}

		return new Item({
			serviceId,
			id,
			type,
			title,
			episodeTitle,
			season,
			episode,
		});
	}
}

export const DisneyplusParser = new _DisneyplusParser();
