import { ScrobbleParser } from '@common/ScrobbleParser';
import { ScrobbleItem } from '@models/Item';
import { AnilibriaApi } from '@/anilibria/AnilibriaApi';

class _AnilibriaParser extends ScrobbleParser {
	constructor() {
		super(AnilibriaApi, {
			watchingUrlRegex: /\/anime\/video\/episode\/(?<id>[^/?#]+)/,
		});
	}

	protected override async parseItemFromApi(): Promise<ScrobbleItem | null> {
		const id = this.parseItemIdFromUrl();
		if (!id) {
			return null;
		}
		const episode = await AnilibriaApi.getEpisode(id);
		return AnilibriaApi.convertEpisode(episode);
	}

	parseItemFromDom(): ScrobbleItem | null {
		return null;
	}
}

export const AnilibriaParser = new _AnilibriaParser();
