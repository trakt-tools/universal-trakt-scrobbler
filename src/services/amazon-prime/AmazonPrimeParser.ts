import { AmazonPrimeApi } from '@/amazon-prime/AmazonPrimeApi';
import { ScrobbleParser, ScrobblePlayback } from '@common/ScrobbleParser';
import { correctItemTitle, EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';

interface PrimeEpisodeInfo {
	season: number;
	number: number;
	title: string;
}

interface PrimePlaybackMetadata {
	title: string;
	episode: PrimeEpisodeInfo | null;
}

class _AmazonPrimeParser extends ScrobbleParser {
	private itemChangePending = false;

	constructor() {
		super(AmazonPrimeApi, {
			videoPlayerSelector: '.dv-player-fullscreen video:not(.tst-video-overlay-player-html5)',
			watchingUrlRegex: /\/detail\//,
		});
	}

	async parsePlayback(): Promise<ScrobblePlayback | null> {
		if (this.itemChangePending) {
			// The previous empty tick let ScrobbleEvents stop the old item.
			// Clear unmatched items too, since the controller only clears matched ones.
			this.clearItem();
		}

		const currentItem = this.getItem();
		if (currentItem) {
			const metadata = this.getPlaybackMetadata();
			if (metadata && this.hasItemChanged(currentItem, metadata)) {
				this.itemChangePending = true;
				return null;
			}
		}

		return super.parsePlayback();
	}

	override clearItem(): void {
		super.clearItem();
		this.itemChangePending = false;
	}

	// The detail URL can name a season or an earlier episode, so it is not an active item ID.
	protected override parseItemFromApi(): Promise<ScrobbleItem | null> {
		return Promise.resolve(null);
	}

	protected override parseItemFromDom(): ScrobbleItem | null {
		const metadata = this.getPlaybackMetadata();
		if (!metadata) {
			return null;
		}
		const { title, episode } = metadata;
		const serviceId = this.api.id;

		if (episode) {
			const card = this.findEpisodeCard(title, episode);
			const cardTitle = card?.querySelector('h3')?.textContent?.trim() ?? '';
			const episodeTitle =
				episode.title || cardTitle.replace(/^\d+\.\s*(?:Episode\s+\d+\s*)?/i, '').trim();
			return new EpisodeItem({
				serviceId,
				id: this.getEpisodeGti(card),
				title: episodeTitle,
				season: episode.season,
				number: episode.number,
				show: { serviceId, title },
			});
		}

		return new MovieItem({ serviceId, title });
	}

	private getPlaybackMetadata(): PrimePlaybackMetadata | null {
		const player = this.videoPlayer?.isConnected
			? this.videoPlayer.closest('[id^="dv-web-player"]')
			: null;
		const playerTitle = player?.querySelector('.atvwebplayersdk-title-text')?.textContent?.trim();
		const pageTitle = document.querySelector('h1')?.textContent?.trim();
		const title = playerTitle || pageTitle;
		if (!title) {
			return null;
		}

		// Prime unmounts its controls during playback. The detail page's primary
		// play action remains in the DOM and identifies the selected episode.
		const pageMatchesPlayer =
			!playerTitle ||
			(!!pageTitle && this.getShowTitle(pageTitle) === this.getShowTitle(playerTitle));
		const episode =
			this.getEpisodeInfo(
				player?.querySelector('.atvwebplayersdk-episode-info, .atvwebplayersdk-subtitle-text')
			) ??
			(pageMatchesPlayer
				? this.getEpisodeInfo(document.querySelector('[data-testid="dp-atf-play-button"]'))
				: null);
		if (!episode && document.querySelector('[id^="av-ep-episode-"]')) {
			// Missing episode metadata on a series page is not evidence of a movie.
			return null;
		}

		const correctedTitle = episode ? this.getShowTitle(title) : correctItemTitle(title);
		const current = this.getItem();
		if (
			!playerTitle &&
			current &&
			correctedTitle !== (current.type === 'episode' ? current.show.title : current.title)
		) {
			// Hidden controls must not switch back to a stale detail-page title.
			return null;
		}
		return { title: correctedTitle, episode };
	}

	private hasItemChanged(current: ScrobbleItem, metadata: PrimePlaybackMetadata): boolean {
		if (metadata.episode) {
			if (current.type !== 'episode') {
				return true;
			}
			return (
				current.show.title !== metadata.title ||
				current.season !== metadata.episode.season ||
				current.number !== metadata.episode.number
			);
		}
		return current.type !== 'movie' || current.title !== metadata.title;
	}

	private getEpisodeInfo(element?: Element | null): PrimeEpisodeInfo | null {
		return (
			this.parseEpisodeInfo(element?.getAttribute('aria-label')) ??
			this.parseEpisodeInfo(element?.textContent)
		);
	}

	private parseEpisodeInfo(value?: string | null): PrimeEpisodeInfo | null {
		const text = value?.trim() ?? '';
		const match =
			/\bS(?<season>\d+)\s*E(?<number>\d+)\s*(?<title>.*)$/i.exec(text) ??
			/Season\s+(?<season>\d+),?\s*Ep\.?\s*(?<number>\d+)\s*(?<title>.*)/i.exec(text);
		if (!match?.groups) {
			return null;
		}

		const number = Number(match.groups.number);
		const title = (match.groups.title ?? '')
			.replace(new RegExp(`^Episode\\s+${number}\\b[\\s:–-]*`, 'i'), '')
			.trim();
		return { season: Number(match.groups.season), number, title };
	}

	private getShowTitle(displayTitle: string): string {
		// The player can use a licensed collection title such as "Attack on Titan
		// Season 2" even when the detail page identifies the show as "Attack on Titan".
		const pageMatch = /^Prime Video:\s*(.+?)\s+-\s+Season\s+\d+\s*$/i.exec(document.title);
		const canonicalTitle = correctItemTitle(pageMatch?.[1]?.trim() ?? '');
		const collectionTitle = correctItemTitle(
			displayTitle.replace(/\s+(?:-\s*)?Season\s+\d+\s*$/i, '').trim()
		);
		return canonicalTitle && collectionTitle.toLowerCase() === canonicalTitle.toLowerCase()
			? canonicalTitle
			: correctItemTitle(displayTitle);
	}

	private findEpisodeCard(showTitle: string, episode: PrimeEpisodeInfo): Element | null {
		const pageTitle = document.querySelector('h1')?.textContent?.trim();
		if (!pageTitle || this.getShowTitle(pageTitle) !== showTitle) {
			return null;
		}
		// Only borrow page data when its show, season, and episode match playback.
		for (const button of Array.from(
			document.querySelectorAll('[id^="av-ep-episode-"] [data-testid="episodes-playbutton"]')
		)) {
			const cardEpisode = this.getEpisodeInfo(button);
			if (cardEpisode?.season === episode.season && cardEpisode.number === episode.number) {
				return button.closest('[id^="av-ep-episode-"]');
			}
		}
		return null;
	}

	private getEpisodeGti(card: Element | null): string | null {
		const href = card?.querySelector('a[href^="primevideo://detail?"]')?.getAttribute('href');
		return href ? new URL(href).searchParams.get('gti') : null;
	}
}

export const AmazonPrimeParser = new _AmazonPrimeParser();
