import * as moment from 'moment';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { RequestException, Requests } from '../../common/Requests';
import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

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

class _ViaplayApi extends Api {
	INITIAL_URL = 'https://viaplay.com/';
	HOST_URL = '';
	HISTORY_API_URL = '';
	HISTORY_API_NEXT_PAGE_URL = '';
	AUTH_URL = '';
	isActivated = false;

	constructor() {
		super('viaplay');
	}

	activate = async () => {
		const response = await fetch(this.INITIAL_URL);
		const host = response.url.split('//')[1];
		const region = /no|se|dk|fi/.exec(host)?.[0] ?? 'no';

		this.HOST_URL = `https://content.${host}`;
		this.HISTORY_API_URL = `${this.HOST_URL}pcdash-${region}/watched`;
		this.AUTH_URL = `https://login.${host}api/persistentLogin/v1?deviceKey=pcdash-${region}`;
		this.HISTORY_API_NEXT_PAGE_URL = this.HISTORY_API_URL;

		await Requests.send({
			url: this.AUTH_URL,
			method: 'GET',
		});
		this.isActivated = true;
	};

	loadHistory = async (itemsToLoad: number, lastSync: number, lastSyncId: string) => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			const store = getSyncStore('viaplay');
			let { hasReachedEnd, hasReachedLastSyncDate } = store.data;
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
					let filteredItems = [];
					if (lastSync > 0) {
						for (const viaplayProduct of viaplayProducts) {
							if (
								viaplayProduct.user.progress?.updated &&
								Math.trunc(viaplayProduct.user.progress?.updated / 1e3) > lastSync
							) {
								filteredItems.push(viaplayProduct);
							} else {
								hasReachedLastSyncDate = true;
								break;
							}
						}
						if (filteredItems.length !== viaplayProducts.length) {
							hasReachedEnd = true;
						}
					} else {
						filteredItems = viaplayProducts;
					}
					itemsToLoad -= filteredItems.length;
					historyItems.push(...filteredItems);
				} else {
					hasReachedEnd = true;
				}
				const url = historyPage._links?.next?.href;
				this.HISTORY_API_NEXT_PAGE_URL = url;
				if (!url) {
					hasReachedEnd = true;
				}
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				items = historyItems.map(this.parseHistoryItem);
			}
			store.setData({ items, hasReachedEnd, hasReachedLastSyncDate });
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load Viaplay history.', err);
				await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
			throw err;
		}
	};

	parseHistoryItem = (historyItem: ViaplayProduct): Item => {
		let item: Item;
		const serviceId = this.id;
		const year = historyItem.content.production.year;
		const progress = historyItem.user.progress;
		const percentageWatched = progress?.elapsedPercent || 0;
		const watchedAt = progress ? moment(progress.updated) : undefined;
		const id = historyItem.system.guid;
		if (historyItem.type === 'episode') {
			const content = historyItem.content;
			const title = content.originalTitle ?? content.series.title;
			const season = content.series.season.seasonNumber;
			const episode = content.series.episodeNumber;
			const episodeTitle = content.title !== title ? content.title : content.series.episodeTitle;
			item = new Item({
				serviceId,
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
			item = new Item({ serviceId, id, type: 'movie', title, year, percentageWatched, watchedAt });
		}
		return item;
	};
}

export const ViaplayApi = new _ViaplayApi();

registerApi('viaplay', ViaplayApi);
