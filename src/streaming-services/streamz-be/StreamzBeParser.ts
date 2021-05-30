import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleParser';
import { StreamzBeApi } from './StreamzBeApi';

class _StreamzBeParser extends ScrobbleParser {
	constructor() {
		super(StreamzBeApi, {
			watchingUrlRegex: /\/afspelen\/(.+)/, // https://www.streamz.be/streamz/afspelen/e870cbdf1-77f7-4b06-8dce-2437686eb096 => e870cbdf1-77f7-4b06-8dce-2437686eb096
		});
	}

	parsePlaybackFromDom() {
		const progressElement: HTMLElement | null = document.querySelector('.pui__seekbar__scrubber');
		const progress = progressElement ? parseFloat(progressElement.style.left) : 0.0;

		return progress > 0.0 ? { progress } : null;
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const titleElement = document.querySelector('.player__title');
		const id = this.parseItemIdFromUrl();
		let showTitle: string | null = null;
		let seasonId: string | null = null;
		let episodeId: string | null = null;
		let subTitle: string | undefined = undefined;

		// Shows get a title like this (dutch example): "Raised by Wolves S1 A1 Aflevering 1"
		const matches = /(.+) S(\d+) A(\d+) (.+)/.exec(titleElement?.textContent ?? '');

		if (matches) {
			[, showTitle, seasonId, episodeId, subTitle] = matches;
		}

		const title = showTitle ?? titleElement?.textContent ?? '';
		const episodeTitle = subTitle ?? '';
		const season = parseInt(seasonId ?? '') || 0;
		const episode = parseInt(episodeId ?? '') || 0;
		const type = seasonId ? 'show' : 'movie';

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

export const StreamzBeParser = new _StreamzBeParser();

registerScrobbleParser('streamz-be', StreamzBeParser);
