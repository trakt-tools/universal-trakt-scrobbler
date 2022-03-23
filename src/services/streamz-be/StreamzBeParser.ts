import { StreamzBeApi } from '@/streamz-be/StreamzBeApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _StreamzBeParser extends ScrobbleParser {
	constructor() {
		super(StreamzBeApi, {
			watchingUrlRegex: /\/afspelen\/(?<id>.+)/, // https://www.streamz.be/streamz/afspelen/e870cbdf1-77f7-4b06-8dce-2437686eb096 => e870cbdf1-77f7-4b06-8dce-2437686eb096
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('.player__title');
		const id = this.parseItemIdFromUrl();
		let showTitle: string | null = null;
		let seasonId: string | null = null;
		let episodeId: string | null = null;
		let subTitle: string | undefined = undefined;

		if (!titleElement) {
			return null;
		}

		// Shows get a title like this (dutch example): "Raised by Wolves S1 A1 Aflevering 1"
		const matches = /(?<showTitle>.+) S(?<seasonId>\d+) A(?<episodeId>\d+) (?<subTitle>.+)/.exec(
			titleElement?.textContent ?? ''
		);

		if (matches?.groups) {
			({ showTitle, seasonId, episodeId, subTitle } = matches.groups);
		}

		const title = showTitle ?? titleElement?.textContent ?? '';

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

export const StreamzBeParser = new _StreamzBeParser();
