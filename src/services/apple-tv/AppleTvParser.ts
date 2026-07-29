import { AppleTvApi } from '@/apple-tv/AppleTvApi';
import { ScrobbleParser, ScrobblePlayback } from '@common/ScrobbleParser';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';

type AppleTvContentType = 'episode' | 'movie' | 'show';
type AppleTvLdType = 'Episode' | 'Movie';

interface AppleTvRoute {
	id: string;
	type: AppleTvContentType;
}

interface AppleTvLdBase {
	'@graph'?: AppleTvLdItem[];
	'@type'?: string | string[];
	dateCreated?: string;
	datePublished?: string;
	name?: string;
	url?: string;
}

interface AppleTvLdMovie extends AppleTvLdBase {
	'@type'?: 'Movie' | string[];
}

interface AppleTvLdEpisode extends AppleTvLdBase {
	'@type'?: 'Episode' | string[];
	episodeNumber?: number | string;
	partOfSeason?: number | string | { seasonNumber?: number | string };
	partOfSeries?: { name?: string };
}

type AppleTvLdItem = AppleTvLdMovie | AppleTvLdEpisode;

interface AppleTvEpisodeDetails {
	number: number;
	season: number;
	showTitle: string;
	title: string;
}

/**
 * Apple TV renders promotional videos throughout the site, while the actual long-form
 * player is mounted in a dedicated `video-container`. Item metadata is server-rendered
 * as semantic meta tags and JSON-LD, while active player overlays expose the current
 * item through player metadata. Homepage playback can leave the URL at its locale root,
 * so matching content links provide exact IDs when available. Page metadata is checked
 * against the current `umc.cmc.*` URL ID, and player metadata is fingerprinted so SPA
 * and autoplay transitions cannot retain the previous item.
 */
class _AppleTvParser extends ScrobbleParser {
	private itemIdentity: string | null = null;

	constructor() {
		super(AppleTvApi, {
			videoPlayerSelector: '[data-testid="video-container"] video',
			watchingUrlRegex: /\/(?<contentType>movie|episode|show)\/[^/?#]+\/(?<id>umc\.cmc\.[^/?#]+)/,
		});
	}

	async parsePlayback(): Promise<ScrobblePlayback | null> {
		const route = this.parseRoute();
		const identity = this.getPlaybackIdentity(route);
		if (this.getItem() && this.itemIdentity !== identity) {
			this.clearItem();
			this.itemIdentity = null;
		}

		const playback = await super.parsePlayback();
		if (playback && this.getItem()) {
			this.itemIdentity = identity;
		}
		return playback;
	}

	protected parseItemFromApi(): Promise<ScrobbleItem | null> {
		return Promise.resolve(null);
	}

	protected parseItemFromDom(): ScrobbleItem | null {
		const route = this.parseRoute();
		if (!document.querySelector('[data-testid="video-player"]') || this.isExcludedLocation()) {
			return null;
		}
		if (!route) {
			return this.parseItemFromPlayer(null);
		}

		const metadataId = this.getMetaContent('apple:content_id');
		if (route.type === 'movie' && metadataId === route.id && !this.playerMatchesPageTitle()) {
			return null;
		}
		if (metadataId !== route.id) {
			return this.parseItemFromPlayer(route);
		}

		const item =
			route.type === 'movie'
				? this.parseMovie(route)
				: route.type === 'episode'
					? this.parseEpisode(route)
					: null;
		return item ?? this.parseItemFromPlayer(route);
	}

	private parseRoute(): AppleTvRoute | null {
		const match = /\/(?<contentType>movie|episode|show)\/[^/?#]+\/(?<id>umc\.cmc\.[^/?#]+)/.exec(
			this.getLocation()
		);
		if (!match?.groups) {
			return null;
		}

		return {
			id: match.groups.id,
			type: match.groups.contentType as AppleTvContentType,
		};
	}

	private parseMovie(route: AppleTvRoute): MovieItem | null {
		const ld = this.getLdItem<AppleTvLdMovie>('Movie', route.id);
		const title = this.getMetaContent('apple:title') || ld?.name?.trim() || '';
		if (!title) {
			return null;
		}

		const releaseDate =
			this.getMetaContent('og:video:release_date', 'property') ||
			ld?.datePublished ||
			ld?.dateCreated ||
			'';
		const year = parseInt(/^(?<year>\d{4})/.exec(releaseDate)?.groups?.year ?? '') || 0;

		return new MovieItem({
			serviceId: this.api.id,
			id: route.id,
			title,
			year,
		});
	}

	private parseEpisode(route: AppleTvRoute): EpisodeItem | null {
		const ld = this.getLdItem<AppleTvLdEpisode>('Episode', route.id);
		const details = this.getEpisodeDetails(ld);
		if (!details) {
			return null;
		}

		return this.buildEpisode(route.id, details);
	}

	private getEpisodeDetails(ld: AppleTvLdEpisode | null): AppleTvEpisodeDetails | null {
		if (!ld) {
			return null;
		}

		const seasonValue =
			typeof ld.partOfSeason === 'object' ? ld.partOfSeason.seasonNumber : ld.partOfSeason;
		const season = this.parseNonNegativeInteger(seasonValue);
		const number = this.parseNonNegativeInteger(ld.episodeNumber);
		const title =
			this.getMetaContent('apple:title') ||
			document.querySelector('.page-header .episode-title')?.textContent?.trim() ||
			'';
		const showTitle =
			ld.partOfSeries?.name?.trim() ||
			document
				.querySelector<HTMLAnchorElement>('.page-header a[href*="/show/"]')
				?.textContent?.trim() ||
			this.getShowTitleFromLdName(ld.name, title);

		if (season === null || number === null || !title || !showTitle) {
			return null;
		}

		return { season, number, title, showTitle };
	}

	private parseItemFromPlayer(route: AppleTvRoute | null): ScrobbleItem | null {
		const player = document.querySelector('[data-testid="video-player"]');
		const title = player
			?.querySelector('[data-testid="player-metadata-title"]')
			?.textContent?.trim();
		const subtitle = player
			?.querySelector('[data-testid="player-metadata-subtitle"]')
			?.textContent?.trim();
		if (!title) {
			return null;
		}

		if (route?.type === 'movie') {
			const movieId =
				this.getMetaContent('apple:content_id') === route.id
					? route.id
					: this.findContentId('movie', title);
			return movieId ? new MovieItem({ serviceId: this.api.id, id: movieId, title }) : null;
		}
		if (
			route?.type === 'show' &&
			(this.getMetaContent('apple:content_id') !== route.id ||
				this.getMetaContent('apple:title') !== title)
		) {
			return null;
		}

		const details = this.parsePlayerEpisode(title, subtitle ?? '');
		if (details) {
			const showId =
				route?.type === 'show' ? route.id : (this.findContentId('show', details.showTitle) ?? null);
			const id =
				route?.type === 'episode'
					? route.id
					: (this.findEpisodeId(details, showId) ??
						this.getEpisodeIdentity(showId ?? 'player', details));
			return this.buildEpisode(id, details);
		}

		if (route) {
			return null;
		}

		const movieId = this.findContentId('movie', title);
		return movieId ? new MovieItem({ serviceId: this.api.id, id: movieId, title }) : null;
	}

	private parsePlayerEpisode(showTitle: string, subtitle: string): AppleTvEpisodeDetails | null {
		const titleMatch = this.matchSeasonAndEpisode(showTitle);
		const subtitleMatch = this.matchSeasonAndEpisode(subtitle);
		const match = subtitleMatch ?? titleMatch;
		if (!match?.groups) {
			return null;
		}

		const season = this.parseNonNegativeInteger(match.groups.season);
		const number = this.parseNonNegativeInteger(match.groups.number);
		if (season === null || number === null) {
			return null;
		}

		const episodeTitle = subtitleMatch
			? this.removeSeasonAndEpisode(subtitle, subtitleMatch)
			: this.removeSeasonAndEpisode(showTitle, titleMatch);
		const parsedShowTitle = subtitleMatch ? showTitle : subtitle;

		if (!episodeTitle || !parsedShowTitle) {
			return null;
		}

		return { season, number, title: episodeTitle, showTitle: parsedShowTitle };
	}

	private getPlaybackIdentity(route: AppleTvRoute | null): string | null {
		const player = document.querySelector('[data-testid="video-player"]');
		const title = player
			?.querySelector('[data-testid="player-metadata-title"]')
			?.textContent?.trim();
		const subtitle = player
			?.querySelector('[data-testid="player-metadata-subtitle"]')
			?.textContent?.trim();
		const details = title ? this.parsePlayerEpisode(title, subtitle ?? '') : null;
		if (details) {
			const showId =
				route?.type === 'show' ? route.id : this.findContentId('show', details.showTitle);
			return this.getEpisodeIdentity(showId ?? route?.id ?? 'player', details);
		}
		if (!title) {
			return null;
		}

		const movieId = route?.type === 'movie' ? route.id : this.findContentId('movie', title);
		return movieId ? `movie:${movieId}` : null;
	}

	private getEpisodeIdentity(routeId: string, details: AppleTvEpisodeDetails): string {
		return `${routeId}:s${details.season}e${details.number}:${details.showTitle}:${details.title}`;
	}

	private findEpisodeId(details: AppleTvEpisodeDetails, showId: string | null): string | null {
		const ids = Array.from(
			document.querySelectorAll<HTMLAnchorElement>('a[href*="/episode/"]')
		).flatMap((anchor) => {
			const text = anchor.textContent?.trim() ?? '';
			const titleMatches = this.getAnchorTitles(anchor).some(
				(value) => this.normalizeTitle(value) === this.normalizeTitle(details.title)
			);
			const textMatches = this.normalizeTitle(text).includes(this.normalizeTitle(details.title));
			const numbering = this.matchSeasonAndEpisode(text);
			if (
				(!titleMatches && !textMatches) ||
				(numbering?.groups &&
					(numbering.groups.season !== details.season.toString() ||
						numbering.groups.number !== details.number.toString()))
			) {
				return [];
			}

			try {
				const url = new URL(anchor.href, window.location.origin);
				const linkedShowId = url.searchParams.get('showId');
				const id =
					!showId || !linkedShowId || linkedShowId === showId
						? this.getContentIdFromUrl(url.href, 'episode')
						: null;
				return id ? [id] : [];
			} catch (_err) {
				return [];
			}
		});

		return ids.length === 1 ? ids[0] : null;
	}

	private findContentId(type: 'movie' | 'show', title: string): string | null {
		const normalizedTitle = this.normalizeTitle(title);
		const ids = Array.from(
			document.querySelectorAll<HTMLAnchorElement>(`a[href*="/${type}/"]`)
		).flatMap((anchor) => {
			const matches = this.getAnchorTitles(anchor).some(
				(value) => this.normalizeTitle(value) === normalizedTitle
			);
			const id = matches ? this.getContentIdFromUrl(anchor.href, type) : null;
			return id ? [id] : [];
		});

		const uniqueIds = Array.from(new Set(ids));
		return uniqueIds.length === 1 ? uniqueIds[0] : null;
	}

	private getAnchorTitles(anchor: HTMLAnchorElement): string[] {
		return [
			anchor.getAttribute('aria-label') ?? '',
			anchor.getAttribute('title') ?? '',
			...Array.from(anchor.querySelectorAll<HTMLImageElement>('img[alt]')).map(
				(image) => image.alt
			),
			anchor.querySelector('.title')?.textContent?.trim() ?? '',
			anchor.textContent?.trim() ?? '',
		].filter(Boolean);
	}

	private normalizeTitle(value: string): string {
		return value
			.toLocaleLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, ' ')
			.trim();
	}

	private playerMatchesPageTitle(): boolean {
		const pageTitle = this.getMetaContent('apple:title');
		const playerTitle = document
			.querySelector('[data-testid="video-player"] [data-testid="player-metadata-title"]')
			?.textContent?.trim();
		return (
			!!pageTitle &&
			!!playerTitle &&
			this.normalizeTitle(pageTitle) === this.normalizeTitle(playerTitle)
		);
	}

	private getContentIdFromUrl(url: string, type: AppleTvContentType): string | null {
		try {
			return (
				new RegExp(`/${type}/[^/?#]+/(?<id>umc\\.cmc\\.[^/?#]+)`).exec(
					new URL(url, window.location.origin).pathname
				)?.groups?.id ?? null
			);
		} catch (_err) {
			return null;
		}
	}

	private isExcludedLocation(): boolean {
		return /\/(?:clip|sporting-event)\//.test(new URL(this.getLocation()).pathname);
	}

	private matchSeasonAndEpisode(value: string): RegExpExecArray | null {
		return /\bS(?<season>\d+)\s*[,·]?\s*E(?<number>\d+)\b/i.exec(value);
	}

	private removeSeasonAndEpisode(value: string, match: RegExpExecArray | null): string {
		if (!match) {
			return value.trim();
		}
		return value
			.replace(match[0], '')
			.replace(/^[\s,·:–—-]+|[\s,·:–—-]+$/g, '')
			.trim();
	}

	private buildEpisode(id: string, details: AppleTvEpisodeDetails): EpisodeItem {
		return new EpisodeItem({
			serviceId: this.api.id,
			id,
			title: details.title,
			season: details.season,
			number: details.number,
			show: {
				serviceId: this.api.id,
				title: details.showTitle,
			},
		});
	}

	private getLdItem<T extends AppleTvLdItem>(type: AppleTvLdType, id: string): T | null {
		for (const script of Array.from(
			document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
		)) {
			let parsed: AppleTvLdItem | AppleTvLdItem[];
			try {
				parsed = JSON.parse(script.textContent ?? '') as AppleTvLdItem | AppleTvLdItem[];
			} catch (_err) {
				continue;
			}

			const roots = Array.isArray(parsed) ? parsed : [parsed];
			const items = roots.flatMap((root) => [root, ...(root['@graph'] ?? [])]);
			for (const item of items) {
				const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
				if (!types.includes(type)) {
					continue;
				}

				const isCurrentItem = item.url
					? this.urlContainsExactId(item.url, id)
					: this.getMetaContent('apple:content_id') === id;
				if (isCurrentItem) {
					return item as T;
				}
			}
		}
		return null;
	}

	private urlContainsExactId(url: string | undefined, id: string): boolean {
		if (!url) {
			return false;
		}

		try {
			return new URL(url, window.location.origin).pathname.split('/').includes(id);
		} catch (_err) {
			return false;
		}
	}

	private getShowTitleFromLdName(name: string | undefined, episodeTitle: string): string {
		if (!name || !episodeTitle) {
			return '';
		}

		const suffix = ` - ${episodeTitle}`;
		return name.endsWith(suffix) ? name.slice(0, -suffix.length).trim() : '';
	}

	private getMetaContent(name: string, attribute = 'name'): string {
		return (
			document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)?.content?.trim() ?? ''
		);
	}

	private parseNonNegativeInteger(value: number | string | undefined): number | null {
		const parsed = typeof value === 'number' ? value : parseInt(value ?? '');
		return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
	}
}

export const AppleTvParser = new _AppleTvParser();
