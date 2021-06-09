import { Item } from '../../models/Item';
import { ScrobbleParser } from '../common/ScrobbleParser';
import { GoplayBeApi } from './GoplayBeApi';

class _GoplayBeParser extends ScrobbleParser {
	constructor() {
		super(GoplayBeApi, {
			watchingUrlRegex: /\/video\/.+\/([^#]+)/, // https://www.goplay.be/video/hetisingewikkeld/hetisingewikkeld-s2/hetisingewikkeld-s2-aflevering-1#autoplay => hetisingewikkeld-s2-aflevering-1
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('title');
		const id = this.parseItemIdFromUrl();
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

export const GoplayBeParser = new _GoplayBeParser();
