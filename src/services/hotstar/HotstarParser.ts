import { ScrobbleParser, ScrobblePlayback } from '@common/ScrobbleParser';
import { HotstarApi } from '@/hotstar/HotstarApi';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';

interface HotstarLdEpisode {
	'@type'?: string;
	episodeNumber?: string;
	name?: string;
	url?: string;
}

interface HotstarLdSeason {
	'@type'?: string;
	seasonNumber?: string;
	episode?: HotstarLdEpisode;
}

interface HotstarLd {
	'@type'?: string | string[];
	name?: string;
	url?: string;
	releaseYear?: string;
	containsSeason?: HotstarLdSeason | HotstarLdSeason[];
}

/**
 * JioHotstar is a Next.js single-page app whose markup is hostile to scraping:
 *
 *   - The player uses build-hashed, obfuscated class names (e.g. `bO4AyXwRYHuSKMa5...`)
 *     that change on every deploy, so structural/class selectors can't be relied on.
 *   - The rich schema.org JSON-LD (`Movie` / `TVSeries`) is only server-rendered on a
 *     full page load. After an in-app navigation (e.g. "Next Episode", autoplay) it is
 *     NOT re-injected, so it goes stale/absent for the rest of the session.
 *   - `document.title`, `og:title` and the URL's `episodeNumber`/`seasonId` query params
 *     are unreliable after in-app navigation (title reverts to the generic site title,
 *     and the query params are frequently off by one).
 *
 * So item parsing draws from two stable sources, in order:
 *   1. JSON-LD          - clean and complete, but only on a full page load.
 *   2. The player title overlay - an `aria-label` of the form
 *      "<show>, Season N, Episode N, <title>" (with an "S<n> E<n> <title>" text fallback),
 *      which the player keeps in the DOM and updates on in-app navigation.
 *
 * The content type (movie vs. show) is taken from the URL, which is always accurate.
 */
class _HotstarParser extends ScrobbleParser {
	constructor() {
		super(HotstarApi, {
			// JioHotstar renders two <video> elements: the content player inside
			// `#video-container` and pre-roll/mid-roll ads inside `#ad-video-container`.
			// The default `video` selector grabs whichever comes first in the DOM (often
			// the ad), so playback tracking attached to the ad element and dropped out
			// when it ended. Scope to the content player so tracking is consistent.
			videoPlayerSelector: '#video-container video',
			watchingUrlRegex: /(?:movies|shows)\/.+\/(?<id>\d+)\//,
		});
	}

	/**
	 * The base class only re-parses the item once the cached one is cleared, which
	 * normally happens on navigation via the controller's `stopScrobble()`. That clearing
	 * is skipped when an item never matched on Trakt, and JioHotstar advances between
	 * episodes through in-app navigation, so a stale item could otherwise stick and block
	 * detection of the new content. Drop it as soon as the URL's content id changes so the
	 * next tick re-parses what's actually playing.
	 */
	async parsePlayback(): Promise<ScrobblePlayback | null> {
		const item = this.getItem();
		if (item) {
			const currentId = this.parseItemIdFromUrl();
			if (currentId && item.id !== currentId) {
				this.clearItem();
			}
		}
		return super.parsePlayback();
	}

	/**
	 * Hotstar has no public metadata API we can query, so skip the API step - the base
	 * implementation logs a "not implemented" error - and let parsing fall through to the
	 * DOM.
	 */
	protected parseItemFromApi(): Promise<ScrobbleItem | null> {
		return Promise.resolve(null);
	}

	parseItemFromDom(): ScrobbleItem | null {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		if (!id) {
			return null;
		}

		const location = this.getLocation();
		const ld = this.parseLdJson(id);
		const heading = document.querySelector('h1')?.textContent?.trim() ?? '';

		if (location.includes('/movies/')) {
			const title = (ld?.['@type'] === 'Movie' ? ld.name : '') || heading;
			if (!title) {
				return null;
			}
			const year = ld?.['@type'] === 'Movie' ? parseInt(ld.releaseYear ?? '') || 0 : 0;
			return new MovieItem({ serviceId, id, title, year });
		}

		if (location.includes('/shows/')) {
			return this.parseEpisode(serviceId, id, ld, heading);
		}

		return null;
	}

	private parseEpisode(
		serviceId: string,
		id: string,
		ld: HotstarLd | null,
		heading: string
	): ScrobbleItem | null {
		// 1. JSON-LD (present on a full page load).
		const types = Array.isArray(ld?.['@type']) ? ld?.['@type'] : [ld?.['@type']];
		if (ld && types?.includes('TVSeries')) {
			const season = Array.isArray(ld.containsSeason) ? ld.containsSeason[0] : ld.containsSeason;
			const episode = season?.episode;
			if (episode) {
				return new EpisodeItem({
					serviceId,
					id,
					title: episode.name ?? '',
					season: parseInt(season?.seasonNumber ?? '') || 0,
					number: parseInt(episode.episodeNumber ?? '') || 0,
					show: { serviceId, title: ld.name ?? heading },
				});
			}
		}

		if (!heading) {
			return null;
		}

		// 2. Player overlay aria-label "<show>, Season N, Episode N, <title>". The show part
		// must match the heading so a recommendation/up-next rail can't be mistaken for the
		// item currently playing.
		for (const el of Array.from(document.querySelectorAll('[aria-label]'))) {
			const label = el.getAttribute('aria-label') ?? '';
			const match =
				/^(?<show>.+?),\s*Season\s*(?<season>\d+),\s*Episode\s*(?<number>\d+),\s*(?<title>.+)$/i.exec(
					label
				);
			if (match?.groups && match.groups.show.trim() === heading) {
				return this.buildEpisode(serviceId, id, heading, match.groups);
			}
		}

		// 3. Player overlay "S<season> E<number> <title>" text (fallback for the aria-label).
		for (const el of Array.from(document.querySelectorAll('p, span'))) {
			if (el.children.length) {
				continue;
			}
			const match = /^S(?<season>\d+)\s*E(?<number>\d+)\s+(?<title>.+)$/.exec(
				el.textContent?.trim() ?? ''
			);
			if (match?.groups && match.groups.title.length > 1) {
				return this.buildEpisode(serviceId, id, heading, match.groups);
			}
		}

		return null;
	}

	private buildEpisode(
		serviceId: string,
		id: string,
		show: string,
		groups: Record<string, string>
	): EpisodeItem {
		return new EpisodeItem({
			serviceId,
			id,
			title: groups.title.trim(),
			season: parseInt(groups.season) || 0,
			number: parseInt(groups.number) || 0,
			show: { serviceId, title: show },
		});
	}

	/**
	 * Parses the schema.org JSON-LD `Movie` / `TVSeries` node, but only returns it when its
	 * url references the content id currently in the page URL. The id is matched exactly
	 * (extracted from the url) rather than via substring, so a shorter id can't collide with
	 * a longer one, and stale metadata left over from a previous page isn't trusted.
	 */
	private parseLdJson(id: string): HotstarLd | null {
		const scripts = document.querySelectorAll<HTMLScriptElement>(
			'script[type="application/ld+json"]'
		);
		for (const script of Array.from(scripts)) {
			let data: HotstarLd;
			try {
				data = JSON.parse(script.textContent ?? '') as HotstarLd;
			} catch (_err) {
				continue;
			}
			const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
			if (types.includes('Movie')) {
				if (this.ldUrlMatchesId(data.url, id)) {
					return data;
				}
			} else if (types.includes('TVSeries')) {
				const season = Array.isArray(data.containsSeason)
					? data.containsSeason[0]
					: data.containsSeason;
				if (this.ldUrlMatchesId(season?.episode?.url, id)) {
					return data;
				}
			}
		}
		return null;
	}

	private ldUrlMatchesId(url: string | undefined, id: string): boolean {
		if (!url) {
			return false;
		}
		const match = /\/(\d+)\/watch\/?$/.exec(url) ?? /\/(\d+)\/?$/.exec(url);
		return match?.[1] === id;
	}
}

export const HotstarParser = new _HotstarParser();
