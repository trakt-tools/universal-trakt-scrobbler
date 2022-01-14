import { ScrobbleParser } from '@common/ScrobbleParser';
import { PlayerPlApi } from '@/player-pl/PlayerPlApi';
import { Item } from '@models/Item';

class _PlayerPlParser extends ScrobbleParser {
	constructor() {
		super(PlayerPlApi, {
			videoPlayerSelector: 'video', // This is the default option, so it doesn't need to be specified
			watchingUrlRegex: /\/.+-online\/(.+)/,
			// https://player.pl/programy-online/top-model-odcinki,132
			// https://player.pl/seriale-online/pulapka-odcinki,13643
			// https://player.pl/programy-online/kuchenne-rewolucje-odcinki,114
			// https://player.pl/programy-online/kuchenne-rewolucje-odcinki,114/odcinek-14,S23E14,225386
			// https://player.pl/programy-online/kuchenne-rewolucje-odcinki,114/odcinek-12,S23E12,216368
			// https://player.pl/programy-online/40-kontra-20-odcinki,31988
			// https://player.pl/filmy-online/listy-do-m-4,198123
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('.seo-visible h1');
		const episodeTitleElement = document.querySelector('span[data-test-id="nuvi-asset-info-box-title"]');
		const episodeElement = document.querySelector('span[data-test-id="nuvi-asset-info-box-episode"]');
		const seasonElement = document.querySelector('span[data-test-id="nuvi-asset-info-box-season"]');
		const id = this.parseItemIdFromUrl();
		let seasonId: string | null = null;
		let episodeId: string | null = null;

		const matches = /Sezon (\d+),.+dcinek (\d+)/.exec(
			(seasonElement?.textContent ?? '') + (episodeElement?.textContent ?? '')
		);

		if (matches) {
			[, seasonId, episodeId] = matches;
		}

		const title = titleElement?.textContent ?? '';
		const episodeTitle = episodeTitleElement?.textContent ?? '';
		const season = parseInt(seasonId ?? '') || 0;
		const episode = parseInt(episodeId ?? '') || 0;
		const type = season > 0 ? 'show' : 'movie';

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

export const PlayerPlParser = new _PlayerPlParser();
