import { ScrobbleParser } from '@common/ScrobbleParser';
import { HotstarApi } from '@/hotstar/HotstarApi';
import { EpisodeItem, MovieItem } from '@models/Item';

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

class _HotstarParser extends ScrobbleParser {
	constructor() {
		super(HotstarApi, {
			watchingUrlRegex: /(?:movies|shows)\/.+\/(?<id>\d+)\//,
		});
	}

	/**
	 * JioHotstar renders the player with build-hashed, obfuscated class names (e.g.
	 * `bO4AyXwRYHuSKMa5...`) that change on every deploy, so the player DOM can't be
	 * scraped reliably. The page does embed schema.org JSON-LD metadata (a `Movie` or
	 * `TVSeries` node), which is stable and is what we parse instead.
	 */
	private parseLdJson(): HotstarLd | null {
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
			if (types.includes('Movie') || types.includes('TVSeries')) {
				return data;
			}
		}
		return null;
	}

	parseItemFromDom() {
		const serviceId = this.api.id;
		const id = this.parseItemIdFromUrl();
		const ld = this.parseLdJson();

		if (!id || !ld) {
			return null;
		}

		const types = Array.isArray(ld['@type']) ? ld['@type'] : [ld['@type']];

		if (types.includes('TVSeries')) {
			const season = Array.isArray(ld.containsSeason) ? ld.containsSeason[0] : ld.containsSeason;
			const episode = season?.episode;

			// Guard against stale metadata after an in-app (SPA) navigation: only trust
			// the JSON-LD if it points at the episode the URL currently references.
			if (!episode || (episode.url && !episode.url.includes(id))) {
				return null;
			}

			return new EpisodeItem({
				serviceId,
				id,
				title: episode.name ?? '',
				season: parseInt(season?.seasonNumber ?? '') || 0,
				number: parseInt(episode.episodeNumber ?? '') || 0,
				show: {
					serviceId,
					title: ld.name ?? '',
				},
			});
		}

		if (types.includes('Movie')) {
			if (ld.url && !ld.url.includes(id)) {
				return null;
			}

			return new MovieItem({
				serviceId,
				id,
				title: ld.name ?? '',
				year: parseInt(ld.releaseYear ?? '') || 0,
			});
		}

		return null;
	}
}

export const HotstarParser = new _HotstarParser();
