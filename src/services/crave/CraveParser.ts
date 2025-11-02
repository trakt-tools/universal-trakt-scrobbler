import { ScrobbleParser } from '@common/ScrobbleParser';
import { CraveApi } from '@/crave/CraveApi';
import { EpisodeItem, ScrobbleItem, ShowItemValues } from '@models/Item';
import { Shared } from '@common/Shared';

class _CraveParser extends ScrobbleParser {
	isStaleUrl = false;
	episodeContext: Partial<EpisodeItem> | null = null;

	constructor() {
		super(CraveApi, {
			/**
			 * When actively watching, the path will be /play/ followed by the content path.
			 * Crave's API does a lookup based on that content path to get the content info.
			 * Examples:
			 * https://www.crave.ca/en/play/30-rock/cutbacks-s3e17-458963 => play/30-rock/cutbacks-s3e17-458963
			 * https://www.crave.ca/en/play/ghostbusters-2362155 => play/ghostbusters-2362155
			 */
			watchingUrlRegex: /(?<id>play\/.+)/,
		});
	}

	protected async parseItemFromApi(): Promise<ScrobbleItem | null> {
		if (this.isStaleUrl) {
			// Stop using the API to get full details if the URL has gone stale.
			return null;
		}

		const apiItem = await super.parseItemFromApi();

		if (apiItem?.type === 'episode' && !this.episodeContext) {
			// Save context about the originally loaded show so that it can be used
			// for subsequent requests when querying video information from the DOM.
			// This is mainly so that the year disambiguation is still available when
			// watching multiple episodes from a show.
			this.episodeContext = {
				year: apiItem.year,
				show: apiItem.show,
			};
		}

		return this.overrideItemIfStale(apiItem);
	}

	protected parseItemFromDom(): Promise<ScrobbleItem | null> {
		const subtitle =
			document.querySelector('[class^=jasper-player-title__subtitle]')?.innerHTML ?? '';
		const extractedData = /S(?<season>\d+) E(?<number>\d+): (?<episodeTitle>.+)/.exec(subtitle);
		if (!extractedData?.groups) {
			return Promise.resolve(null);
		}
		return Promise.resolve(
			new EpisodeItem({
				serviceId: this.api.id,
				id: subtitle,
				title: extractedData.groups.episodeTitle ?? '',
				season: Number(extractedData.groups.season ?? 0),
				number: Number(extractedData.groups.number ?? 0),
				year: this.episodeContext?.year,
				show: this.episodeContext?.show as ShowItemValues,
			})
		);
	}

	/**
	 * Get an item that should override the original item if it has gone stale, and emit
	 * events to update the state of the current item.
	 * @param item The potentially stale item.
	 * @returns The item that should override the original item when stale, or the original item.
	 */
	private async overrideItemIfStale(item: ScrobbleItem | null): Promise<ScrobbleItem | null> {
		if (item?.type === 'episode') {
			// The video URL doesn't update when clicking the "Play Next" button, so the
			// current item may be wrong. Check if that's the case, and if it is, correct the item.
			const domItem = await this.parseItemFromDom();
			if (
				domItem?.type === 'episode' &&
				(domItem.season !== item.season || domItem.number !== item.number)
			) {
				// Mark the URL as stale so that future calls know to skip calling the API.
				this.isStaleUrl = true;
				// The scrobbler only explicitly rechecks trakt mapping data after stopping playback. Manually
				// dispatch the event so that the item is fully updated.
				await Shared.events.dispatch('SCROBBLING_ITEM_CORRECTED', null, {
					oldItem: item,
					newItem: domItem,
				});
				return domItem;
			}
		}
		return item;
	}
}

export const CraveParser = new _CraveParser();
