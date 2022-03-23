import { VtmgoBeApi } from '@/vtmgo-be/VtmgoBeApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _VtmgoBeParser extends ScrobbleParser {
	constructor() {
		super(VtmgoBeApi, {
			watchingUrlRegex: /\/afspelen\/(?<id>.+)/, // https://vtm.be/vtmgo/afspelen/eabdf5ee5-66a7-46dd-b0d2-24d6e2cf513d => eabdf5ee5-66a7-46dd-b0d2-24d6e2cf513d
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

		// Shows get a title like this (dutch example): "Huis Gesmaakt met Gert Voorjans S1 A1 Aflevering 1"
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

export const VtmgoBeParser = new _VtmgoBeParser();
