import { ScrobbleParser } from '@common/ScrobbleParser';
import { HotstarApi } from '@/hotstar/HotstarApi';
import { EpisodeItem, MovieItem } from '@models/Item';

class _HotstarParser extends ScrobbleParser {
	constructor() {
		super(HotstarApi, {
			watchingUrlRegex: /\/(?:movies|tv)\/(?<id>.+)/,
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const titleElement = document.querySelector('.primary-title');

		if (!titleElement) {
			return null;
		}

		const title = titleElement?.textContent ?? '';
		const seasonEpisodeElement = document.querySelector(
			'.show-title .meta-data-holder'
		)?.firstChild;
		const subTitleElement = document.querySelector('.show-title .meta-data-holder')?.lastChild;

		let seasonId: string | null = null;
		let episodeId: string | null = null;
		const subTitle = subTitleElement?.textContent ?? '';

		const matches = /(?<seasonId>[\d]+)\s.(?<episodeId>[\d]+)/.exec(
			seasonEpisodeElement?.textContent ?? ''
		);

		if (matches?.groups) {
			({ seasonId, episodeId } = matches.groups);
		}

		if (seasonId) {
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
				title: subTitle,
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

export const HotstarParser = new _HotstarParser();
