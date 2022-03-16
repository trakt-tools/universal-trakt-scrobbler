import { HboGoApi } from '@/hbo-go/HboGoApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _HboGoParser extends ScrobbleParser {
	constructor() {
		super(HboGoApi, {
			watchingUrlRegex: /\.+\/(?<id>.+)\/.+/, // https://hbogo.pl/series/euphoria/season-2 --> no id in the url!
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('#hbo-sdk--player-title .content-title');
		const subTitleElement = document.querySelector('#hbo-sdk--player-title .content-details');
		let seasonId: string | null = null;
		let episodeId: string | null = null;

		if (!titleElement) {
			return null;
		}

		const matches = /.+ (?<seasonId>\d+) .+ (?<episodeId>\d+)/.exec(
			subTitleElement?.textContent ?? ''
		);

		if (matches?.groups) {
			({ seasonId, episodeId } = matches.groups);
		}

		const title = titleElement?.textContent ?? '';

		if (seasonId) {
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
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
			title,
		});
	}
}

export const HboGoParser = new _HboGoParser();
