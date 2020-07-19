import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { registerApi } from '../common/common';

export interface HboGoGlobalObject {
	analytics: {
		content: HboGoMetadataItem;
		paused: boolean;
	};
	player: {
		currentPlaybackProgress: {
			source: {
				_value: {
					progressPercent: number;
				};
			};
		};
	};
}

export interface HboGoSession {
	content: HboGoMetadataItem;
	playing: boolean;
	paused: boolean;
	progress: number;
}

export type HboGoMetadataItem = HboGoMetadataShowItem | HboGoMetadataMovieItem;

export interface HboGoMetadataShowItem {
	Category: 'Series';
	Id: string;
	Index: number;
	Name: string;
	ProductionYear: number;
	SeasonIndex: number;
	SeriesName: string;
}

export interface HboGoMetadataMovieItem {
	Category: 'Movies';
	Id: string;
	Name: string;
	ProductionYear: number;
}

class _HboGoApi extends Api {
	hasInjectedSessionScript: boolean;
	sessionListener: ((event: Event) => void) | null;

	constructor() {
		super('hbo-go');

		this.hasInjectedSessionScript = false;
		this.sessionListener = null;
	}

	loadHistory = (nextPage: number, nextVisualPage: number, itemsToLoad: number): Promise<void> => {
		return Promise.resolve();
	};

	parseMetadata = (metadata: HboGoMetadataItem): Item => {
		let item: Item;
		const { Id: id, ProductionYear: year = 0 } = metadata;
		const type = metadata.Category === 'Series' ? 'show' : 'movie';
		if (metadata.Category === 'Series') {
			const title = metadata.SeriesName.trim();
			const { SeasonIndex: season, Index: episode } = metadata;
			const episodeTitle = metadata.Name.trim();
			const isCollection = false;
			item = new Item({ id, type, title, year, season, episode, episodeTitle, isCollection });
		} else {
			const title = metadata.Name.trim();
			item = new Item({ id, type, title, year });
		}
		return item;
	};

	getSession = (): Promise<HboGoSession | undefined | null> => {
		return new Promise((resolve) => {
			if ('wrappedJSObject' in window && window.wrappedJSObject) {
				// Firefox wraps page objects, so we can access the global netflix object by unwrapping it.
				let session: HboGoSession | undefined | null;
				const { sdk } = window.wrappedJSObject;
				if (sdk) {
					const { content, paused } = sdk.analytics;
					const progress = sdk.player.currentPlaybackProgress.source._value.progressPercent;
					const playing = typeof progress !== 'undefined' && !paused;
					session =
						typeof progress !== 'undefined' && content
							? { content, playing, paused, progress }
							: null;
				}
				resolve(session);
			} else {
				// Chrome does not allow accessing page objects from extensions, so we need to inject a script into the page and exchange messages in order to access the global netflix object.
				if (!this.hasInjectedSessionScript) {
					const script = document.createElement('script');
					script.textContent = `
						window.addEventListener('uts-getSession', () => {
							let session;
							if (sdk) {
								const { content, paused } = sdk.analytics;
								const progress = sdk.player.currentPlaybackProgress.source._value.progressPercent;
								const playing = typeof progress !== 'undefined' && !paused;
								session = typeof progress !== 'undefined' && content ? { content, playing, paused, progress } : null;
							}
							const event = new CustomEvent('uts-onSessionReceived', {
								detail: { session: JSON.stringify(session) },
							});
							window.dispatchEvent(event);
						});
					`;
					document.body.appendChild(script);
					this.hasInjectedSessionScript = true;
				}
				if (this.sessionListener) {
					window.removeEventListener('uts-onSessionReceived', this.sessionListener);
				}
				this.sessionListener = (event: Event) => {
					const session = (event as CustomEvent<Record<'session', string | undefined>>).detail
						.session;
					if (typeof session === 'undefined') {
						resolve(session);
					} else {
						resolve(JSON.parse(session) as HboGoSession | null);
					}
				};
				window.addEventListener('uts-onSessionReceived', this.sessionListener, false);
				const event = new CustomEvent('uts-getSession');
				window.dispatchEvent(event);
			}
		});
	};
}

export const HboGoApi = new _HboGoApi();

registerApi('hbo-go', HboGoApi);
