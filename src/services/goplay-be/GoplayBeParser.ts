import { GoplayBeApi } from '@/goplay-be/GoplayBeApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { Item } from '@models/Item';

class _GoplayBeParser extends ScrobbleParser {
	constructor() {
		super(GoplayBeApi, {
			watchingUrlRegex: /\/video\/.+\/(?<id>[^#]+)/, // https://www.goplay.be/video/hetisingewikkeld/hetisingewikkeld-s2/hetisingewikkeld-s2-aflevering-1#autoplay => hetisingewikkeld-s2-aflevering-1
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
		const matches = /(?<showTitle>.+) - S(?<seasonId>\d+) - Aflevering (?<episodeId>\d+)/.exec(
			titleElement?.textContent ?? ''
		);

		if (matches?.groups) {
			({ showTitle, seasonId, episodeId } = matches.groups);
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
