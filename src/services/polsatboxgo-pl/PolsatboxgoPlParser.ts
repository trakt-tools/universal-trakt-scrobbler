import { PolsatboxgoPlApi } from '@/polsatboxgo-pl/PolsatboxgoPlApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _PolsatboxgoPlParser extends ScrobbleParser {
	constructor() {
		super(PolsatboxgoPlApi, {
			watchingUrlRegex: /\/wideo\/seriale|film\/.+\/(?<id>.+)\/.+/,
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
		let matches = /\/wideo\/seriale|film\/(?<showTitle>.+)\/.+/.exec(this.getLocation());

		if (matches?.groups) {
			({ showTitle } = matches.groups);
		}

		matches = /\/.+\/sezon-(?<seasonId>\d+)\/.+\/(?<epiTitle>.+)-odc.+(?<episodeId>\d+)\/.+/.exec(
			this.getLocation()
		);

		if (matches?.groups) {
			({ seasonId, epiTitle, episodeId } = matches.groups);
		}

		const title = showTitle?.split('/')[0];

		if (!title) {
			return null;
		}

		if (seasonId) {
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
				title: epiTitle ?? '',
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

export const PolsatboxgoPlParser = new _PolsatboxgoPlParser();
