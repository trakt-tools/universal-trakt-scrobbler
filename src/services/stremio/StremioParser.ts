import { ScrobbleParser } from '@common/ScrobbleParser';
import { StremioApi } from '@/stremio/StremioApi';
import { EpisodeItem, MovieItem } from '@models/Item';

class _StremioParser extends ScrobbleParser {
	constructor() {
		super(StremioApi, {
			watchingUrlRegex: /\/player\/(?:movie|series)\/(?<id>.+)/, // https://streamingservice.com/watch/ABC123 => ABC123
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const titleElem = document.querySelector('#windowTitle')?.textContent ?? '';
		let showTitle: string | null = null;
		let seasonId: string | null = null;
		let episodeId: string | null = null;
		let subTitle: string | undefined = undefined;

		if (!titleElem) {
			return null;
		}

		const match = /(?<showTitle>.+) - (?<subTitle>.+) \((?<seasonId>\d+)x(?<episodeId>\d+)\)/.exec(
			titleElem ?? ''
		);

		if (match?.groups) {
			({ showTitle, seasonId, episodeId, subTitle } = match.groups);
		}

		const title = showTitle ?? titleElem ?? '';

		if (seasonId) {
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
				title: subTitle ?? '',
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

export const StremioParser = new _StremioParser();
