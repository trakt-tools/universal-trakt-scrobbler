import { ScrobbleParser } from '@common/ScrobbleParser';
import { KinoPubApi } from '@/kino-pub/KinoPubApi';
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

		if (season === 0) {
			// Movie: use original title (after " / ") if available
			const titleParts = rawTitle.split(' / ');
			const title = titleParts.length > 1 ? titleParts[titleParts.length - 1] : rawTitle;

			return new MovieItem({
				serviceId,
				id,
				title,
				year,
			});
		}

		// Episode: show title from document.title, episode title from aria-label
		const showTitleParts = rawTitle.split(' / ');
		const showTitle =
			showTitleParts.length > 1 ? showTitleParts[showTitleParts.length - 1] : rawTitle;

		const player = document.querySelector('media-player');
		const ariaLabel = player?.getAttribute('aria-label') ?? '';
		const episodeTitleMatch = /\u2014\s(.+)$/.exec(ariaLabel);
		const episodeTitle = episodeTitleMatch?.[1] ?? '';

		return new EpisodeItem({
			serviceId,
			id,
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
