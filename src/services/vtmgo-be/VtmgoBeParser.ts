import { VtmgoBeApi } from '@/vtmgo-be/VtmgoBeApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { Item } from '@models/Item';

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

		// Shows get a title like this (dutch example): "Huis Gesmaakt met Gert Voorjans S1 A1 Aflevering 1"
		const matches = /(?<showTitle>.+) S(?<seasonId>\d+) A(?<episodeId>\d+) (?<subTitle>.+)/.exec(
			titleElement?.textContent ?? ''
		);

		if (matches?.groups) {
			({ showTitle, seasonId, episodeId, subTitle } = matches.groups);
		}

		const title = showTitle ?? titleElement?.textContent ?? '';
		const episodeTitle = subTitle ?? '';
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

export const VtmgoBeParser = new _VtmgoBeParser();
