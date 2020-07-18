import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { HboGoApi, HboGoMetadataItem, HboGoSession } from './HboGoApi';

class _HboGoParser implements ScrobbleParser {
	parseItem = async (): Promise<Item | undefined> => {
		// If we can access the global sdk object from the page, there is no need to parse the page in order to retrieve the item being watched.
		let item: Item | undefined;
		const session = (await HboGoApi.getSession()) || this.parseSession();
		if (session && session.content.Id) {
			item = HboGoApi.parseMetadata(session.content);
		}
		return item;
	};

	parseSession = (): HboGoSession => {
		const content = {} as HboGoMetadataItem;
		const contentTitleElement = document.querySelector('.contentTitle');
		if (contentTitleElement) {
			const contentTitle = contentTitleElement.textContent?.trim() ?? '';
			const showMatches = /(.+?)\s\|\sS(\d+?)\sE(\d+?)\s(.+)/.exec(contentTitle);
			content.Id = contentTitle.replace(' ', '');
			content.ProductionYear = 0;
			content.Category = showMatches ? 'Series' : 'Movies';
			if (content.Category === 'Series') {
				content.SeriesName = showMatches?.[0] ?? '';
				content.SeasonIndex = parseInt(showMatches?.[1] ?? '0');
				content.Index = parseInt(showMatches?.[2] ?? '0');
				content.Name = showMatches?.[3] ?? '';
			} else {
				content.Name = contentTitle;
			}
		}
		const playing = !!document.querySelector('.playbackPauseButton');
		const paused = !!document.querySelector('.playbackPlayButton');
		const progress = this.parseProgress();
		return { content, playing, paused, progress };
	};

	parseProgress = (): number => {
		let progress = 0.0;
		const scrubber: HTMLElement | null = document.querySelector('.timelineProgress');
		if (scrubber) {
			progress = parseFloat(scrubber.style.width);
		}
		return progress;
	};
}

export const HboGoParser = new _HboGoParser();

registerScrobbleParser('hbo-go', HboGoParser);
