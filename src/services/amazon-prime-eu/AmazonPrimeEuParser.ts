import { AmazonPrimeEuApi } from '@/amazon-prime-eu/AmazonPrimeEuApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { Item } from '@models/Item';

class _AmazonPrimeEuParser extends ScrobbleParser {
	constructor() {
		super(AmazonPrimeEuApi, {
			watchingUrlRegex: /\/detail\/(.+)/, // https://www.primevideo.com/detail/0SXLM6OIAQ0DUSWD1815OYS4EY/ref=atv_hm_hom_c_7d0kid_4_1
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const titleElement = document.querySelector('.atvwebplayersdk-title-text');
		const title = titleElement?.textContent?.split(':')[0].toString() ?? '';
		const subTitleElement = document.querySelector('.atvwebplayersdk-subtitle-text');
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

export const AmazonPrimeEuParser = new _AmazonPrimeEuParser();
