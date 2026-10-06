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
	isSeries: boolean;
}

class _AmazonPrimeParser extends ScrobbleParser {
	private episodeChangePending = false;

	constructor() {
		super(AmazonPrimeApi, {
			videoPlayerSelector: '.dv-player-fullscreen video:not(.tst-video-overlay-player-html5)',
			watchingUrlRegex: /\/detail\//,
		});
	}

	async parsePlayback(): Promise<ScrobblePlayback | null> {
		if (this.episodeChangePending) {
			// The previous empty tick let ScrobbleEvents stop the old episode.
			// Clear unmatched items too, since the controller only clears matched ones.
			this.clearItem();
		}

		const currentItem = this.getItem();
		if (currentItem) {
			const metadata = this.getPlaybackMetadata();
			if (metadata && this.isDifferentTitle(currentItem, metadata)) {
				this.episodeChangePending = true;
				return null;
			}
		}

		return super.parsePlayback();
	}

	override clearItem(): void {
		super.clearItem();
		this.episodeChangePending = false;
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
		const { title, episode, isSeries } = metadata;
		const serviceId = AmazonPrimeApi.id;

		if (episode) {
			const card = this.findEpisodeCard(episode);
			const cardTitle = card?.querySelector('h3')?.textContent?.trim() ?? '';
			const episodeTitle =
				episode.title || cardTitle.replace(/^\d+\.\s*(?:Episode\s+\d+\s*)?/i, '').trim();
			return new EpisodeItem({
				serviceId,
				id: this.getEpisodeGti(card),
				title: episodeTitle,
				season: episode.season,
				number: episode.number,
				show: { serviceId, title: this.getShowTitle(title) },
			});
		}
		if (isSeries) {
			// A series page without an episode number must not become a movie scrobble.
			return null;
		}

		return new MovieItem({ serviceId, title });
	}

	private getPlaybackMetadata(): PrimePlaybackMetadata | null {
		const player = this.videoPlayer?.isConnected
			? this.videoPlayer.closest('[id^="dv-web-player"]')
			: null;
		const playerTitle = player?.querySelector('.atvwebplayersdk-title-text')?.textContent?.trim();
		const pageTitle = document.querySelector('h1')?.textContent?.trim();
		const title = pageTitle || playerTitle;
		if (!title) {
			return null;
		}

		// Prime unmounts its controls during playback. The detail page's primary
		// play action remains in the DOM and identifies the selected episode.
		const playerEpisode = player?.querySelector(
			'.atvwebplayersdk-episode-info, .atvwebplayersdk-subtitle-text'
		)?.textContent;
		const primaryEpisode = document.querySelector(
			'[data-testid="dp-atf-play-button"]'
		)?.textContent;
		const episode = this.parseEpisodeInfo(playerEpisode) ?? this.parseEpisodeInfo(primaryEpisode);
		return {
			title,
			episode,
			isSeries: !episode && !!document.querySelector('[id^="av-ep-episode-"]'),
		};
	}

	private isDifferentTitle(current: ScrobbleItem, metadata: PrimePlaybackMetadata): boolean {
		if (metadata.episode) {
			if (current.type !== 'episode') {
				return true;
			}
			return (
				current.show.title !== correctItemTitle(this.getShowTitle(metadata.title)) ||
				current.season !== metadata.episode.season ||
				current.number !== metadata.episode.number
			);
		}
		return (
			current.type === 'movie' &&
			!metadata.isSeries &&
			current.title !== correctItemTitle(metadata.title)
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

	private getShowTitle(playerTitle: string): string {
		// The player can use a licensed collection title such as "Attack on Titan
		// Season 2" even when the detail page identifies the show as "Attack on Titan".
		const pageTitle = /^Prime Video:\s*(.+?)\s+-\s+Season\s+\d+\s*$/i.exec(document.title);
		const canonicalTitle = pageTitle?.[1]?.trim();
		return canonicalTitle && playerTitle.toLowerCase().includes(canonicalTitle.toLowerCase())
			? canonicalTitle
			: playerTitle;
	}

	private findEpisodeCard(episode: PrimeEpisodeInfo): Element | null {
		return (
			Array.from(document.querySelectorAll('[id^="av-ep-episode-"]')).find((card) => {
				// The detail page can still show the previous season after autoplay.
				// Only borrow its GTI/title when a play action confirms both numbers.
				return Array.from(card.querySelectorAll('[data-testid="episodes-playbutton"]')).some(
					(button) => {
						const cardEpisode =
							this.parseEpisodeInfo(button.getAttribute('aria-label')) ??
							this.parseEpisodeInfo(button.textContent);
						return cardEpisode?.season === episode.season && cardEpisode.number === episode.number;
					}
				);
			}) ?? null
		);
	}

	private getEpisodeGti(card: Element | null): string | null {
		const href = card?.querySelector('a[href^="primevideo://detail?"]')?.getAttribute('href');
		return href ? new URL(href).searchParams.get('gti') : null;
	}
}

export const AmazonPrimeParser = new _AmazonPrimeParser();
