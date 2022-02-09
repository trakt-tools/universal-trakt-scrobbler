import { ScrobbleParser } from '@common/ScrobbleParser';
import { PolsatboxgoPlApi } from '@/polsatboxgo-pl/PolsatboxgoPlApi';
import { Item } from '@models/Item';

class _PolsatboxgoPlParser extends ScrobbleParser {
	constructor() {
		super(PolsatboxgoPlApi, {
			watchingUrlRegex: /\/wideo\/seriale|film\/.+\/(.+)\/.+/,
			// https://polsatboxgo.pl/wideo/seriale/swiat-wedlug-kiepskich/5024045/sezon-1/5028300/swiat-wedlug-kiepskich-odcinek-1/4208
			// https://polsatboxgo.pl/wideo/seriale/przyjaciele/5026786/sezon-5/5026793/przyjaciele-v-odc-2/9812199c372b3523fd7e983e36c9fcf7
			// https://polsatboxgo.pl/wideo/film/najlepszy/e87feb0a3c24fa49096dfd681f68fa4d/ogladaj
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		let showTitle: string | null = null;
		let epiTitle: string | null = null;
		let seasonId: string | null = null;
		let episodeId: string | null = null;
		let matches = /\/wideo\/seriale|film\/(.+)\/.+/.exec(this.getLocation());

		if (matches) {
			[, showTitle] = matches;
		}

		matches = /\/.+\/sezon-(\d+)\/.+\/(.+)-odc.+(\d+)\/.+/.exec(this.getLocation());

		if (matches) {
			[, seasonId, epiTitle, episodeId] = matches;
		}

		const title = showTitle?.split('/')[0];
		const episodeTitle = epiTitle ?? '';
		const season = parseInt(seasonId ?? '') || 0;
		const episode = parseInt(episodeId ?? '') || 0;
		const type = seasonId ? 'show' : 'movie';

		if (!title) {
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

export const PolsatboxgoPlParser = new _PolsatboxgoPlParser();
