import { ScrobbleParser } from '@common/ScrobbleParser';
import { VidioApi } from '@/vidio/VidioApi';
import { EpisodeItem, MovieItem } from '@models/Item';

class _VidioParser extends ScrobbleParser {
	constructor() {
		super(VidioApi, {
			watchingUrlRegex: /\/(?:watch)\/(?<id>.+)/,
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const titleElement = document.querySelector('.video-property-engagement__title--cpp');

		if (!titleElement) {
			return null;
		}

		const title = titleElement?.textContent ?? '';
		const seasonElement = document.querySelector('.watch-playlist-picker__selector');

		if (seasonElement != null) {
			const subTitleElement = document.querySelector('.video-property__title');
			let seasonId: string | null = null;
			let episodeId: string | null = null;
			let subTitle: string | null = '';

			const matchSeason = /(?<seasonId>[\d]+)/.exec(seasonElement?.textContent ?? '');

			if (matchSeason?.groups) {
				({ seasonId } = matchSeason.groups);
			} else {
				seasonId = '1';
			}

			const matches = /(?<episodeId>\d+)(?: - )?(?<subTitle>[\s\S]*$)/.exec(
				subTitleElement?.textContent ?? ''
			);

			if (matches?.groups) {
				({ episodeId, subTitle } = matches.groups);
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
		}

		return new MovieItem({
			serviceId,
			id,
			title,
		});
	}
}

export const VidioParser = new _VidioParser();
