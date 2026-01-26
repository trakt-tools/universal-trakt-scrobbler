import { AmazonPrimeApi } from '@/amazon-prime/AmazonPrimeApi';
import { ScrobbleParser } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';

class _AmazonPrimeParser extends ScrobbleParser {
	constructor() {
		super(AmazonPrimeApi, {
			videoPlayerSelector: '.dv-player-fullscreen video:not(.tst-video-overlay-player-html5)',
			watchingUrlRegex: /\/detail\//,
		});
	}

	// skip API method, we parse from DOM instead
	protected override parseItem(): Promise<ScrobbleItem | null> {
		return Promise.resolve(this.parseItemFromDom());
	}

	protected override parseItemFromDom(): ScrobbleItem | null {
		const serviceId = AmazonPrimeApi.id;

		// find active player container, new ones (dv-web-player-2, etc.) are created when switching video without refresh
		const playerContainer = this.videoPlayer?.closest('[id^="dv-web-player"]');

		// get title from player UI
		const searchContext = playerContainer || document;
		const titleElement = searchContext.querySelector('.atvwebplayersdk-title-text');
		const subtitleElement = searchContext.querySelector('.atvwebplayersdk-subtitle-text');

		if (!titleElement) {
			return null;
		}

		const title = titleElement.textContent?.trim() || '';
		const subtitle = subtitleElement?.textContent?.trim() || '';

		if (!title) {
			return null;
		}

		// check if it's a TV show (has season/episode info in subtitle)
		// ex format: "Season 1, Ep. 4 The Ghouls"
		const episodeMatch = subtitle.match(
			/Season\s+(?<season>\d+),?\s*Ep\.?\s*(?<episode>\d+)\s*(?<episodeTitle>.*)/i
		);
		if (episodeMatch?.groups) {
			const season = parseInt(episodeMatch.groups.season, 10);
			const episodeNumber = parseInt(episodeMatch.groups.episode, 10);
			const episodeTitle = episodeMatch.groups.episodeTitle?.trim() || '';

			// since an "id from service" is required and we don't get/use id for this, we generate one instead
			const showSlug = title.toLowerCase().replace(/[^a-z0-9]/gi, '');
			const episodeSlug = episodeTitle.toLowerCase().replace(/[^a-z0-9]/gi, '');
			const id = `${showSlug}-s${season}-e${episodeNumber}-${episodeSlug}`; // ex: fallout-s1-e4-theghouls

			return new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
				season,
				number: episodeNumber,
				show: {
					serviceId,
					title,
				},
			});
		}

		// otherwise movie
		const movieSlug = title.toLowerCase().replace(/[^a-z0-9]/gi, '');
		return new MovieItem({
			serviceId,
			id: movieSlug, // ex: oppenheimer
			title,
		});
	}
}

export const AmazonPrimeParser = new _AmazonPrimeParser();
