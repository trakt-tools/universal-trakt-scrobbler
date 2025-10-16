import { ScrobbleParser } from '@common/ScrobbleParser';
import { DiscoveryplusApi } from '@/discoveryplus/DiscoveryplusApi';
import { EpisodeItem } from '@models/Item';

class _DiscoveryplusParser extends ScrobbleParser {
	constructor() {
		super(DiscoveryplusApi, {
			// Discovery+ URLs: /video/watch/<showId>/<episodeId>
			watchingUrlRegex: /video\/watch\/(?<showId>[a-f0-9-]+)\/(?<id>[a-f0-9-]+)/,
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();

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
		const seasonEpisodeElement = document.querySelector(
			'span[data-testid="player-ux-season-episode"]'
		);
		if (seasonEpisodeElement) {
			const seText = seasonEpisodeElement.textContent ?? '';
			const seMatch = /S(?<season>\d+)\s*E(?<episode>\d+)/i.exec(seText);
			if (seMatch?.groups) {
				season = parseInt(seMatch.groups.season) || 0;
				number = parseInt(seMatch.groups.episode) || 0;
			}
		}

		if (!season || !number) return null;

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

export const DiscoveryplusParser = new _DiscoveryplusParser();
