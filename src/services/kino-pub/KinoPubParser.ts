import { ScrobbleParser } from '@common/ScrobbleParser';
import { KinoPubApi, extractOriginalTitle } from '@/kino-pub/KinoPubApi';
import { EpisodeItem, MovieItem, type ScrobbleItem } from '@models/Item';

class _KinoPubParser extends ScrobbleParser {
	constructor() {
		super(KinoPubApi, {
			watchingUrlRegex: /\/item\/view\/(?<id>\d+)/,
		});
	}

	protected override parseItemFromApi(): Promise<ScrobbleItem | null> {
		return Promise.resolve(null);
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();

		const seasonEpisodeMatch = /s(\d+)e(\d+)/.exec(location.pathname);
		if (!seasonEpisodeMatch) {
			return null;
		}

		const season = parseInt(seasonEpisodeMatch[1]);
		const episode = parseInt(seasonEpisodeMatch[2]);

		const rawTitle = document.title;
		const yearElement = document.querySelector('a[href*="years="]');
		const year = yearElement ? parseInt(yearElement.textContent ?? '') || undefined : undefined;

		const showTitle = extractOriginalTitle(rawTitle);

		if (season === 0) {
			return new MovieItem({ serviceId, id, title: showTitle, year });
		}

		// Episode: show title from document.title, episode title from aria-label

		const player = document.querySelector('media-player');
		const ariaLabel = player?.getAttribute('aria-label') ?? '';
		const episodeTitleMatch = /\u2014\s(.+)$/.exec(ariaLabel);
		const episodeTitle = episodeTitleMatch?.[1] ?? '';

		return new EpisodeItem({
			serviceId,
			id: `${id}_s${season}e${episode}`,
			title: episodeTitle,
			season,
			number: episode,
			show: {
				serviceId,
				title: showTitle,
			},
		});
	}
}

export const KinoPubParser = new _KinoPubParser();
