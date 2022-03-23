import { GoplayBeApi } from '@/goplay-be/GoplayBeApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _GoplayBeParser extends ScrobbleParser {
	constructor() {
		super(GoplayBeApi, {
			watchingUrlRegex: /\/video\/.+\/(?<id>[^#]+)/, // https://www.goplay.be/video/hetisingewikkeld/hetisingewikkeld-s2/hetisingewikkeld-s2-aflevering-1#autoplay => hetisingewikkeld-s2-aflevering-1
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('title');

		if (!titleElement) {
			return null;
		}

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

		if (seasonId) {
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
				title: '',
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

export const GoplayBeParser = new _GoplayBeParser();
