import * as moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { EventDispatcher, Events } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { Api } from '../common/Api';
import { getStore, registerApi } from '../common/common';

export interface NetflixHistoryResponse {
	viewedItems: NetflixHistoryItem[];
}

export type NetflixHistoryItem = NetflixHistoryShowItem | NetflixHistoryMovieItem;

export interface NetflixHistoryShowItem {
	date: number;
	duration: number;
	episodeTitle: string;
	movieID: number;
	seasonDescriptor: string;
	series: number;
	seriesTitle: string;
	title: string;
}

export interface NetflixHistoryMovieItem {
	date: number;
	duration: number;
	movieID: number;
	title: string;
}

export interface NetflixMetadataResponse {
	value: {
		videos: { [key: number]: NetflixMetadataItem };
	};
}

export type NetflixMetadataItem = NetflixMetadataShowItem | NetflixMetadataMovieItem;

export interface NetflixMetadataShowItem {
	releaseYear: number;
	summary: {
		episode: number;
		id: number;
		season: number;
	};
}

export interface NetflixMetadataMovieItem {
	releaseYear: number;
	summary: {
		id: number;
	};
}

export type NetflixHistoryItemWithMetadata =
	| NetflixHistoryShowItemWithMetadata
	| NetflixHistoryMovieItemWithMetadata;

export type NetflixHistoryShowItemWithMetadata = NetflixHistoryShowItem & NetflixMetadataShowItem;

export type NetflixHistoryMovieItemWithMetadata = NetflixHistoryMovieItem &
	NetflixMetadataMovieItem;

interface ApiParams {
	authUrl: string;
	buildIdentifier: string;
}

class _NetflixApi implements Api {
	HOST_URL: string;
	API_URL: string;
	ACTIVATE_URL: string;
	AUTH_REGEX: RegExp;
	BUILD_IDENTIFIER_REGEX: RegExp;
	isActivated: boolean;
	apiParams: Partial<ApiParams>;
	constructor() {
		this.HOST_URL = 'https://www.netflix.com';
		this.API_URL = `${this.HOST_URL}/api/shakti`;
		this.ACTIVATE_URL = `${this.HOST_URL}/Activate`;
		this.AUTH_REGEX = /"authURL":"(.*?)"/;
		this.BUILD_IDENTIFIER_REGEX = /"BUILD_IDENTIFIER":"(.*?)"/;

		this.isActivated = false;
		this.apiParams = {};
	}

	extractAuthUrl = (text: string): string | undefined => {
		return this.AUTH_REGEX.exec(text)?.[1];
	};

	extractBuildIdentifier = (text: string): string | undefined => {
		return this.BUILD_IDENTIFIER_REGEX.exec(text)?.[1];
	};

	activate = async () => {
		const responseText = await Requests.send({
			url: this.ACTIVATE_URL,
			method: 'GET',
		});
		this.apiParams.authUrl = this.extractAuthUrl(responseText);
		this.apiParams.buildIdentifier = this.extractBuildIdentifier(responseText);
		this.isActivated = true;
	};

	checkParams = (apiParams: Partial<ApiParams>): apiParams is ApiParams => {
		return (
			typeof apiParams.authUrl !== 'undefined' && typeof apiParams.buildIdentifier !== 'undefined'
		);
	};

	loadHistory = async (nextPage: number, nextVisualPage: number, itemsToLoad: number) => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			if (!this.checkParams(this.apiParams)) {
				throw new Error('Invalid API params');
			}
			let isLastPage = false;
			let items: Item[] = [];
			const historyItems: NetflixHistoryItem[] = [];
			do {
				const responseText = await Requests.send({
					url: `${this.API_URL}/${this.apiParams.buildIdentifier}/viewingactivity?languages=en-US&authURL=${this.apiParams.authUrl}&pg=${nextPage}`,
					method: 'GET',
				});
				const responseJson = JSON.parse(responseText) as NetflixHistoryResponse;
				if (responseJson && responseJson.viewedItems.length > 0) {
					itemsToLoad -= responseJson.viewedItems.length;
					historyItems.push(...responseJson.viewedItems);
				} else {
					isLastPage = true;
				}
				nextPage += 1;
			} while (!isLastPage && itemsToLoad > 0);
			if (historyItems.length > 0) {
				const historyItemsWithMetadata = await this.getHistoryMetadata(historyItems);
				items = historyItemsWithMetadata.map(this.parseHistoryItem);
			}
			nextVisualPage += 1;
			getStore('netflix')
				.update({ isLastPage, nextPage, nextVisualPage, items })
				.then(this.loadTraktHistory)
				.catch(() => {
					/** Do nothing */
				});
		} catch (err) {
			Errors.error('Failed to load Netflix history.', err);
			await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, null, {
				error: err as Error,
			});
		}
	};

	getHistoryMetadata = async (historyItems: NetflixHistoryItem[]) => {
		if (!this.checkParams(this.apiParams)) {
			throw new Error('Invalid API params');
		}
		let historyItemsWithMetadata: NetflixHistoryItemWithMetadata[] = [];
		const responseText = await Requests.send({
			url: `${this.API_URL}/${this.apiParams.buildIdentifier}/pathEvaluator?languages=en-US`,
			method: 'POST',
			body: `authURL=${this.apiParams.authUrl}&${historyItems
				.map((historyItem) => `path=["videos",${historyItem.movieID},["releaseYear","summary"]]`)
				.join('&')}`,
		});
		const responseJson = JSON.parse(responseText) as NetflixMetadataResponse;
		if (responseJson && responseJson.value.videos) {
			historyItemsWithMetadata = historyItems.map((historyItem) => {
				const metadata = responseJson.value.videos[historyItem.movieID];
				let combinedItem: NetflixHistoryItemWithMetadata;
				if (metadata) {
					combinedItem = Object.assign({}, historyItem, metadata);
				} else {
					combinedItem = historyItem as NetflixHistoryItemWithMetadata;
				}
				return combinedItem;
			});
		} else {
			throw responseText;
		}
		return historyItemsWithMetadata;
	};

	isShow = (
		historyItem: NetflixHistoryItemWithMetadata
	): historyItem is NetflixHistoryShowItemWithMetadata => {
		return 'series' in historyItem;
	};

	parseHistoryItem = (historyItem: NetflixHistoryItemWithMetadata) => {
		let item: Item;
		const id = historyItem.movieID;
		const type = 'series' in historyItem ? 'show' : 'movie';
		const year = historyItem.releaseYear;
		const watchedAt = moment(historyItem.date);
		if (this.isShow(historyItem)) {
			const title = historyItem.seriesTitle.trim();
			let season;
			let episode;
			const isCollection = !historyItem.seasonDescriptor.includes('Season');
			if (!isCollection) {
				season = historyItem.summary.season;
				episode = historyItem.summary.episode;
			}
			const episodeTitle = historyItem.episodeTitle.trim();
			item = new Item({
				id,
				type,
				title,
				year,
				season,
				episode,
				episodeTitle,
				isCollection,
				watchedAt,
			});
		} else {
			const title = historyItem.title.trim();
			item = new Item({ id, type, title, year, watchedAt });
		}
		return item;
	};

	loadTraktHistory = async () => {
		try {
			let promises = [];
			const items = getStore('netflix').data.items;
			promises = items.map(this.loadTraktItemHistory);
			await Promise.all(promises);
			await getStore('netflix').update();
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

export const NetflixApi = new _NetflixApi();

registerApi('netflix', NetflixApi);
