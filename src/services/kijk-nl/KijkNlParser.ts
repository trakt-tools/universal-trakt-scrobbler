import { KijkNlApi } from '@/kijk-nl/KijkNlApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _KijkNlParser extends ScrobbleParser {
	constructor() {
		super(KijkNlApi, {
			watchingUrlRegex: /\/films|programmas\/.+\/(?<id>.+)/, // https://www.kijk.nl/programmas/steenrijk-straatarm/AaELSZ6dksV
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('title');
		const id = this.parseItemIdFromUrl();
		let showTitle: string | null = null;
		let seasonId: string | null = null;
		let episodeId: string | null = null;

		if (!titleElement) {
			return null;
		}

		// Shows get a title like this (dutch example): "Lang Leve de Liefde: Seizoen 7 Aflevering 175 gemist? Bekijk hier de hele uitzending - kijk.nl"
		//De Bondgenoten: Seizoen 2 Aflevering 156 gemist? Bekijk hier de hele uitzending - kijk.nl
		const matches = /(?<showTitle>.+): Seizoen (?<seasonId>\d+) Aflevering (?<episodeId>\d+)/.exec(
			titleElement?.textContent ?? ''
		);

		if (matches?.groups) {
			({ showTitle, seasonId, episodeId } = matches.groups);
		}

		const title = showTitle?.split(' - ')[0] ?? titleElement?.textContent ?? '';

		if (seasonId) {
			const episodeTitle = showTitle?.split(' - ')[1] ?? '';
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
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

export const KijkNlParser = new _KijkNlParser();
