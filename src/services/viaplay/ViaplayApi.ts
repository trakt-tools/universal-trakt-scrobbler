import { ViaplayService } from '@/viaplay/ViaplayService';
import { ServiceApi } from '@apis/ServiceApi';
import { Errors } from '@common/Errors';
import { RequestException, Requests } from '@common/Requests';
import { Item } from '@models/Item';
import moment from 'moment';

export interface ViaplayAuthResponse {
	success: boolean;
	userData?: {
		firstName: string;
		lastName: string;
		username: string;
		userId: string;
	};
}

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

interface ViaplayProductQuery {
	_embedded: {
		'viaplay:product': ViaplayProduct;
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

class _ViaplayApi extends ServiceApi {
	INITIAL_URL = 'https://viaplay.com/';
	HOST_URL = '';
	API_BASE_URL = '';
	HISTORY_API_URL = '';
	AUTH_URL = '';
	isActivated = false;

	constructor() {
		super(ViaplayService.id);
	}

	async activate() {
		let host;
		if (location.hostname.includes('viaplay')) {
			host = location.hostname + '/';
		} else {
			const response = await fetch(this.INITIAL_URL);
			host = response.url.split('//')[1];
		}
		const region = /no|se|dk|fi/.exec(host)?.[0] ?? 'no';

		this.HOST_URL = `https://content.${host}`;
		this.API_BASE_URL = `${this.HOST_URL}pcdash-${region}/`;
		this.HISTORY_API_URL = `${this.API_BASE_URL}watched`;
		this.AUTH_URL = `https://login.${host}api/persistentLogin/v1?deviceKey=pcdash-${region}`;
		this.nextHistoryUrl = this.HISTORY_API_URL;

		const authResponseText = await Requests.send({
			url: this.AUTH_URL,
			method: 'GET',
		});
		const authResponse = JSON.parse(authResponseText) as ViaplayAuthResponse;
		this.session = {
			profileName: authResponse.userData?.firstName || null,
		};

		this.isActivated = true;
	}

	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(): Promise<ViaplayProduct[]> {
		if (!this.isActivated) {
			await this.activate();
		}
		const responseText = await Requests.send({
			url: this.nextHistoryUrl,
			method: 'GET',
		});
		let historyPage: ViaplayHistoryPage;
		if (this.nextHistoryUrl === this.HISTORY_API_URL) {
			//First initial load/page
			const responseJson = JSON.parse(responseText) as ViaplayWatchedTopResponse;
			historyPage = responseJson._embedded['viaplay:blocks'][0];
		} else {
			historyPage = JSON.parse(responseText) as ViaplayHistoryPage;
		}
		const responseItems = historyPage._embedded['viaplay:products'];
		const url = historyPage._links?.next?.href;
		this.nextHistoryUrl = url;
		this.hasReachedHistoryEnd = !url || responseItems.length === 0;
		return responseItems;
	}

	isNewHistoryItem(historyItem: ViaplayProduct, lastSync: number, lastSyncId: string) {
		return (
			!!historyItem.user.progress?.updated &&
			Math.trunc(historyItem.user.progress?.updated / 1e3) > lastSync
		);
	}

	getHistoryItemId(historyItem: ViaplayProduct) {
		return historyItem.system.guid;
	}

	convertHistoryItems(historyItems: ViaplayProduct[]) {
		const items = historyItems.map((historyItem) => this.parseViaplayProduct(historyItem));
		return items;
	}

	parseViaplayProduct(product: ViaplayProduct): Item {
		let item: Item;
		const serviceId = this.id;
		const year = product.content.production.year;
		const progressInfo = product.user.progress;
		const progress = progressInfo?.elapsedPercent || 0;
		const watchedAt = progressInfo ? moment(progressInfo.updated) : undefined;
		const id = product.system.guid;
		if (product.type === 'episode') {
			const content = product.content;
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
				progress,
				watchedAt,
			});
		} else {
			const title = product.content.title;
			item = new Item({
				serviceId,
				id,
				type: 'movie',
				title,
				year,
				progress,
				watchedAt,
			});
		}
		return item;
	}

	async getItem(id: string): Promise<Item | null> {
		let item: Item | null = null;
		if (!this.isActivated) {
			await this.activate();
		}
		try {
			const responseText = await Requests.send({
				url: this.API_BASE_URL + id + '?partial=true', //the params are optional, but makes the response smaller.
				method: 'GET',
			});
			item = this.parseViaplayProduct(
				(JSON.parse(responseText) as ViaplayProductQuery)._embedded['viaplay:product']
			);
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to get item.', err);
			}
		}
		return item;
	}
}

export const ViaplayApi = new _ViaplayApi();
