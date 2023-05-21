import { ScrobbleParser } from '@common/ScrobbleParser';
import { HotstarApi } from '@/hotstar/HotstarApi';
import { EpisodeItem, MovieItem } from '@models/Item';

class _HotstarParser extends ScrobbleParser {
	constructor() {
		super(HotstarApi, {
			watchingUrlRegex: /(?:movies|shows)\/.+\/(?<id>\d+)\//,
		});
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const titleElement = document.querySelector(
			'div#page-container>div>div>div>div>div>div>div>div>div>div.flex.flex-col>div.flex>p.ON_IMAGE.BUTTON1_MEDIUM'
		);

		if (!titleElement) {
			return null;
		}

		const title = titleElement?.textContent ?? '';
		const subTitleElement = document.querySelector(
			'div#page-container>div>div>div>div>div>div>div>div>div>div.flex.flex-col>p.ON_IMAGE_ALT2.BUTTON3_MEDIUM'
		);

		let seasonId: string | null = null;
		let episodeId: string | null = null;
		let subTitle: string | null = '';

		const matches = /(?<seasonId>[\d]+)\s.(?<episodeId>[\d]+)\s(?<subTitle>.*)/.exec(
			subTitleElement?.textContent ?? ''
		);

		if (matches?.groups) {
			({ seasonId, episodeId, subTitle } = matches.groups);
		}

		if (seasonId) {
			const season = parseInt(seasonId ?? '') || 0;
			const number = parseInt(episodeId ?? '') || 0;

			return new EpisodeItem({
				serviceId,
				id,
				title: subTitle,
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

export const HotstarParser = new _HotstarParser();
