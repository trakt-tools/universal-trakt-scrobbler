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

		// Use XPath since CSS selectors with dynamic classes are unreliable
		const titleXPath =
			'/html/body/div[1]/div[4]/div/div[1]/div[1]/div/div/div[2]/div/div/div/div[2]/div/div/p';
		const subTitleXPath =
			'/html/body/div[1]/div[4]/div/div[1]/div[1]/div/div/div[2]/div/div/div/div[2]/div/p';

		const titleResult = document.evaluate(
			titleXPath,
			document,
			null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		);
		const titleElement = titleResult.singleNodeValue as HTMLElement | null;

		if (!titleElement) {
			return null;
		}

		const title = titleElement?.textContent ?? '';

		const subTitleResult = document.evaluate(
			subTitleXPath,
			document,
			null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		);
		const subTitleElement = subTitleResult.singleNodeValue as HTMLElement | null;

		let seasonId: string | null = null;
		let episodeId: string | null = null;
		let subTitle: string | null = '';

		const matches = /S(?<seasonId>\d+)\sE(?<episodeId>\d+)\s(?<subTitle>.*)/.exec(
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
