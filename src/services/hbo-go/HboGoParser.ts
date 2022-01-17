import { ScrobbleParser } from '@common/ScrobbleParser';
import { HboGoApi } from '@/hbo-go/HboGoApi';
import { Item } from '@models/Item';

class _HboGoParser extends ScrobbleParser {
	constructor() {
		super(HboGoApi, {
			watchingUrlRegex: /\.+\/(.+)\/.+/, // https://hbogo.pl/series/euphoria/season-2 --> no id in the url!
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('#hbo-sdk--player-title .content-title');
		const subTitleElement = document.querySelector('#hbo-sdk--player-title .content-details');
		let seasonId: string | null = null;
		let episodeId: string | null = null;

		const matches = /.+ (\d+) .+ (\d+)/.exec(subTitleElement?.textContent ?? '');

		if (matches) {
			[, seasonId, episodeId] = matches;
		}

		const title = titleElement?.textContent ?? '';
		const episodeTitle = '';
		const season = parseInt(seasonId ?? '') || 0;
		const episode = parseInt(episodeId ?? '') || 0;
		const id = (titleElement?.textContent ?? '') + '-' + season + '-' + episode;
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

export const HboGoParser = new _HboGoParser();
