import { ScrobbleParser } from '@common/ScrobbleParser';
import { HboMaxApi } from '@/hbo-max/HboMaxApi';
import { EpisodeItem, MovieItem } from '@models/Item';

class _HboMaxParser extends ScrobbleParser {
	constructor() {
		super(HboMaxApi, {
			watchingUrlRegex: /video\/watch\/(?<showId>[a-f0-9-]+)\/(?<id>[a-f0-9-]+)/,
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		if (!id) return null;

		const seasonEpisodeElement = document.querySelector(
			'span[data-testid="player-ux-season-episode"]'
		);

		const movieTitleElement = document.querySelector('span[data-testid="player-ux-asset-title"]');

		// EPISODE
		if (seasonEpisodeElement) {
			const labelElement = document.querySelector(
				'p.StyledVisiblyHiddenLabel-Fuse-Web-Play__sc-ja1og5-1'
			);
			if (!labelElement) return null;

			const fullLabel = labelElement.textContent?.trim() ?? '';
			const parts = fullLabel.split(',');
			const showTitle = parts[0]?.trim() ?? '';
			const episodeTitle = parts.slice(2).join(',').trim() || parts[1]?.trim() || '';

			let season = 0;
			let number = 0;

			const seText = seasonEpisodeElement.textContent ?? '';
			const seMatch = /S(?<season>\d+)\s*E(?<episode>\d+)/i.exec(seText);
			if (seMatch?.groups) {
				season = parseInt(seMatch.groups.season) || 0;
				number = parseInt(seMatch.groups.episode) || 0;
			}

			if (season && number) {
				return new EpisodeItem({
					serviceId,
					id,
					title: episodeTitle,
					season,
					number,
					show: {
						serviceId,
						title: showTitle,
					},
				});
			}
		}

		// MOVIE fallback
		if (movieTitleElement) {
			const title = movieTitleElement.textContent?.trim();
			if (!title) return null;

			return new MovieItem({
				serviceId,
				id,
				title,
			});
		}

		return null;
	}
}

export const HboMaxParser = new _HboMaxParser();
