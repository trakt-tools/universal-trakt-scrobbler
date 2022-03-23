import { WakanimTvApi } from '@/wakanim-tv/WakanimTvApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem } from '@models/Item';

class _WakanimTvParser extends ScrobbleParser {
	constructor() {
		super(WakanimTvApi, {
			watchingUrlRegex: /\/.+\/episode\/(?<id>\d+)/,
			// https://www.wakanim.tv/fr/v2/catalogue/episode/34687/ranking-of-kings-saison-1-cour-2-vostfr-episode-12
			// https://www.wakanim.tv/fr/v2/catalogue/episode/38334/police-in-a-pod-saison-1-episode-1-vostfr
			// https://www.wakanim.tv/fr/v2/catalogue/episode/34941/ancient-girls-frame-saison-1-episode-12-vostfr
			// https://www.wakanim.tv/sc/v2/catalogue/episode/34881/drowning-sorrows-in-raging-fire-saison-1-episode-12-vostfr
			// https://www.wakanim.tv/ru/v2/catalogue/episode/33986/deep-insanity-the-lost-child-saison-1-vostfr-episode-12
			// https://www.wakanim.tv/de/v2/catalogue/episode/34699/ranking-of-kings-staffel-1-cour-2-omu-folge-12-omu
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

		// "Drowning Sorrows in Raging Fire Saison 1 Episode 12 VOSTFR - Regardez officiellement sur Wakanim.TV"
		// "Deep Insanity THE LOST CHILD Saison 1 - VOSTFR Episode 12 VOSTFR - Regardez officiellement sur Wakanim.TV"
		// "Ranking of Kings Staffel 1 - Cour 2 (OmU) Folge 12 (OmU.) - Schaue legal auf Wakanim.TV"
		// "Ranking of Kings Saison 1 - Cour 2 - VOSTFR Episode 12 VOSTFR - Regardez officiellement sur Wakanim.TV"
		const matches =
			/(?<showTitle>.+) (?:Staffel|Saison|Season) (?<seasonId>\d+).+(?:Episode|Folge) (?<episodeId>\d+) .+/.exec(
				titleElement?.textContent ?? ''
			);

		if (matches?.groups) {
			({ showTitle, seasonId, episodeId } = matches.groups);
		}

		const title = showTitle ?? titleElement?.textContent ?? '';

		if (seasonId) {
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
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
			id,
			title,
		});
	}
}

export const WakanimTvParser = new _WakanimTvParser();
