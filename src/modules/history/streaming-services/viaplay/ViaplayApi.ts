import * as moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { EventDispatcher, Events } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { Api } from '../common/Api';
import { getStore, registerApi } from '../common/common';

export interface ViaplayWatchedTopResponse {
	_embedded: {
		'viaplay:blocks': [ViaplayHistoryPage];
	};
}

export interface ViaplayHistoryPage {
	currentPage: number;
	pageCount: number;
	productsPerPage: number;
	totalProductCount: number;
	_embedded: {
		'viaplay:products': ViaplayProduct[];
	};
	_links: {
		next: {
			href: string;
		};
	};
}

export type ViaplayProduct = ViaplayEpisode | ViaplayMovie;

export interface ViaplayProductBase {
	type: string;
	publicPath: string;
	system: {
		guid: string;
	};
	user: ViaplayProductUserInfo;
}

export interface ViaplayEpisode extends ViaplayProductBase {
	type: 'episode';
	content: {
		originalTitle?: string; //Show title
		title: string; //Usually Episode title, sometimes Show title :-(
		production: {
			year: number;
		};
		series: {
			episodeNumber: number;
			episodeTitle: string; //Sometimes prefixed with episodeNumber
			title: string; //Show title
			season: {
				seasonNumber: 1;
			};
		};
	};
}

export interface ViaplayMovie extends ViaplayProductBase {
	type: 'movie';
	content: {
		title: string;
		imdb: {
			id: string;
		};
		production: {
			year: number;
		};
	};
}

export interface ViaplayProductUserInfo {
	progress: {
		elapsedPercent?: number;
		watched?: boolean;
		updated?: number;
	};
}

class _ViaplayApi implements Api {
	HOST_URL: string;
	HISTORY_API_URL: string;
	HISTORY_API_NEXT_PAGE_URL: string;
	AUTH_URL: string;
	isActivated: boolean;

	constructor() {
		this.HOST_URL = 'https://content.viaplay.no';
		this.HISTORY_API_URL = `${this.HOST_URL}/pcdash-no/watched`;
		this.AUTH_URL = 'https://login.viaplay.no/api/persistentLogin/v1?deviceKey=pcdash-no';
		this.HISTORY_API_NEXT_PAGE_URL = this.HISTORY_API_URL;

		this.isActivated = false;
	}

	activate = async () => {
		await Requests.send({
			url: this.AUTH_URL,
			method: 'GET',
		});
		this.isActivated = true;
	};

	loadHistory = async (nextPage: number, nextVisualPage: number, itemsToLoad: number) => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			let isLastPage = false;
			let items: Item[] = [];
			const historyItems: ViaplayProduct[] = [];

			do {
				const responseText = await Requests.send({
					url: this.HISTORY_API_NEXT_PAGE_URL,
					method: 'GET',
				});
				let historyPage: ViaplayHistoryPage;
				if (this.HISTORY_API_NEXT_PAGE_URL === this.HISTORY_API_URL) {
					//First initial load/page
					const responseJson = JSON.parse(responseText) as ViaplayWatchedTopResponse;
					historyPage = responseJson._embedded['viaplay:blocks'][0];
				} else {
					historyPage = JSON.parse(responseText) as ViaplayHistoryPage;
				}
				const viaplayProducts: ViaplayProduct[] = historyPage._embedded['viaplay:products'];

				if (viaplayProducts && viaplayProducts.length > 0) {
					itemsToLoad -= viaplayProducts.length;
					historyItems.push(...viaplayProducts);
				} else {
					isLastPage = true;
				}
				nextPage += 1;
				const url = historyPage._links?.next?.href;
				this.HISTORY_API_NEXT_PAGE_URL = url;
				if (!url) {
					isLastPage = true;
				}
			} while (!isLastPage && itemsToLoad > 0);
			if (historyItems.length > 0) {
				items = historyItems.map(this.parseHistoryItem);
			}
			nextVisualPage += 1;
			getStore('viaplay')
				.update({ isLastPage, nextPage, nextVisualPage, items })
				.then(this.loadTraktHistory)
				.catch(() => {
					/** Do nothing */
				});
		} catch (err) {
			Errors.error('Failed to load Viaplay history.', err);
			await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, {
				error: err as Error,
			});
		}
	};

	parseHistoryItem = (historyItem: ViaplayProduct): Item => {
		let item: Item;
		const year = historyItem.content.production.year;
		const percentageWatched = historyItem.user.progress?.elapsedPercent || 0;
		const watchedAt = moment(historyItem.user.progress?.updated);
		const id = parseInt(historyItem.system.guid, 10);
		if (historyItem.type === 'episode') {
			const content = historyItem.content;
			const title = content.originalTitle ?? content.series.title;
			const season = content.series.season.seasonNumber;
			const episode = content.series.episodeNumber;
			const episodeTitle = content.title !== title ? content.title : content.series.episodeTitle;
			item = new Item({
				id,
				type: 'show',
				title,
				year,
				season,
				episode,
				episodeTitle,
				isCollection: false,
				percentageWatched,
				watchedAt,
			});
		} else {
			const title = historyItem.content.title;
			item = new Item({ id, type: 'movie', title, year, percentageWatched, watchedAt });
		}
		return item;
	};

	loadTraktHistory = async () => {
		try {
			let promises = [];
			const items = getStore('viaplay').data.items;
			promises = items.map(this.loadTraktItemHistory);
			await Promise.all(promises);
			void getStore('viaplay').update();
		} catch (err) {
			Errors.error('Failed to load Trakt history.', err);
			await EventDispatcher.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, { error: err as Error });
		}
	};

	loadTraktItemHistory = async (item: Item) => {
		if (!item.trakt) {
			try {
				item.trakt = await TraktSearch.find(item);
				await TraktSync.loadHistory(item);
			} catch (err) {
				item.trakt = {
					notFound: true,
				};
			}
		}
	};
}

export const ViaplayApi = new _ViaplayApi();

registerApi('viaplay', ViaplayApi);
