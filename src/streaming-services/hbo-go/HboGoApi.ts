import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { RequestException, Requests } from '../../common/Requests';
import { ScriptInjector } from '../../common/ScriptInjector';
import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

export interface HboGoGlobalObject {
	player: {
		content?: HboGoMetadataItem;
		currentPlaybackProgress: {
			source: {
				value: {
					duration?: number;
					progressMs?: number;
					progressPercent?: number;
				};
			};
		};
	};
}

export interface HboGoTokenObj {
	sdkVersion: string;
	data: string;
}

export interface HboGoApiParams {
	swVersion: string;
	token: string;
}

export interface HboGoSession {
	videoId: string;
	progress: number;
	progressMs: number;
}

export interface HboGoConfigResponse {
	ConfigurationAPIList: {
		Url: string;
	}[];
}

export interface HboGoSettingsResponse {
	ContentUrl: string;
	CustomerGroupUrl: string;
}

export interface HboGoGroupsResponse {
	Items: {
		Name: string;
		ObjectUrl: string;
	}[];
}

export interface HboGoHistoryResponse {
	Container: (
		| {
				Contents: {
					Items: HboGoHistoryItem[];
				};
		  }
		| undefined
	)[];
}

export interface HboGoHistoryItem {
	Id: string;
	ElapsedPercentage: number;
}

export type HboGoHistoryItemWithMetadata = HboGoHistoryItem & HboGoMetadataItem;

export type HboGoMetadataItem = HboGoMetadataShowItem | HboGoMetadataMovieItem;

export interface HboGoMetadataShowItem extends HboGoHistoryItem {
	Category: 'Series';
	SeasonIndex: number;
	SeriesName: string;
	Index: number;
	Name: string;
	ProductionYear: number;
	Duration: number;
	CreditRollStart: number;
}

export interface HboGoMetadataMovieItem extends HboGoHistoryItem {
	Category: 'Movies';
	Name: string;
	ProductionYear: number;
	Duration: number;
	CreditRollStart: number;
}

class _HboGoApi extends Api {
	HOST_URL = 'https://hbogola.com/';
	ACCOUNT_URL = `${this.HOST_URL}settings/account`;
	API_URL = 'https://globalapi.hbogola.com/v7.0';
	CONFIG_URL = `${this.API_URL}/Configuration/json/ENG/COMP`;
	HISTORY_URL = '';
	CONTENT_URL = '';
	isActivated: boolean;
	apiParams: Partial<HboGoApiParams>;
	leftoverHistoryItems: HboGoHistoryItem[] = [];
	hasReachedHistoryEnd = false;

	constructor() {
		super('hbo-go');

		this.isActivated = false;
		this.apiParams = {};
	}

	async activate() {
		const apiParams = await this.getApiParams();
		if (!apiParams || !this.checkParams(apiParams)) {
			throw new Error('Failed to activate API');
		}
		this.apiParams.swVersion = apiParams.swVersion;
		this.apiParams.token = apiParams.token;

		// Retrieve the API URLs and other important information.
		const configResponseText = await Requests.send({
			url: this.CONFIG_URL,
			headers: {
				'GO-swVersion': this.apiParams.swVersion,
			},
			method: 'GET',
		});
		const config = JSON.parse(configResponseText) as HboGoConfigResponse;
		const settingsUrl = config.ConfigurationAPIList.find((api) => api.Url.includes('Settings'))
			?.Url;
		if (!settingsUrl) {
			throw new Error('Failed to activate API');
		}
		const settingsResponseText = await Requests.send({
			url: settingsUrl,
			method: 'GET',
		});
		const settings = JSON.parse(settingsResponseText) as HboGoSettingsResponse;
		this.CONTENT_URL = settings.ContentUrl;
		const groupsUrl = settings.CustomerGroupUrl.replace(/{ageRating}/i, '-');
		const groupsResponseText = await Requests.send({
			url: groupsUrl,
			headers: {
				'GO-Token': this.apiParams.token,
			},
			method: 'GET',
		});
		const groups = JSON.parse(groupsResponseText) as HboGoGroupsResponse;
		this.HISTORY_URL =
			groups.Items.find((group) => group.Name === 'Recently Watched')
				?.ObjectUrl.replace(/{pageIndex}/i, '-')
				.replace(/{pageSize}/i, '-')
				.replace(/{ageRating}/i, '-')
				.replace(/{operatorId}/i, '-')
				.replace(/{serviceCode}/i, '-') ?? '';
		if (!this.HISTORY_URL) {
			throw new Error('Failed to activate API');
		}
		this.isActivated = true;
	}

	checkParams(apiParams: Partial<HboGoApiParams>): apiParams is HboGoApiParams {
		return typeof apiParams.swVersion !== 'undefined' && typeof apiParams.token !== 'undefined';
	}

	async loadHistory(itemsToLoad: number, lastSync: number, lastSyncId: string): Promise<void> {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			if (!this.checkParams(this.apiParams)) {
				throw new Error('Invalid API params');
			}
			const store = getSyncStore('hbo-go');
			let { hasReachedEnd, hasReachedLastSyncDate } = store.data;
			let items: Item[] = [];
			const historyItems = [];
			do {
				let responseItems: HboGoHistoryItem[] = [];
				if (this.leftoverHistoryItems.length > 0) {
					responseItems = this.leftoverHistoryItems;
					this.leftoverHistoryItems = [];
				} else if (!this.hasReachedHistoryEnd) {
					const responseText = await Requests.send({
						url: this.HISTORY_URL,
						headers: {
							'GO-Token': this.apiParams.token,
						},
						method: 'GET',
					});
					const responseJson = JSON.parse(responseText) as HboGoHistoryResponse;
					if (responseJson) {
						responseItems = responseJson.Container[0]?.Contents.Items ?? [];
					}
					this.hasReachedHistoryEnd = true;
				}
				if (responseItems.length > 0) {
					let filteredItems = [];
					if (lastSync > 0 && lastSyncId) {
						for (const [index, responseItem] of responseItems.entries()) {
							if (responseItem.Id && responseItem.Id !== lastSyncId) {
								filteredItems.push(responseItem);
							} else {
								this.leftoverHistoryItems = responseItems.slice(index);
								hasReachedLastSyncDate = true;
								break;
							}
						}
					} else {
						filteredItems = responseItems;
					}
					itemsToLoad -= filteredItems.length;
					historyItems.push(...filteredItems);
				}
				hasReachedEnd = this.hasReachedHistoryEnd || hasReachedLastSyncDate;
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				const historyItemsWithMetadata = await this.getHistoryMetadata(historyItems);
				items = historyItemsWithMetadata.map((historyItem) => this.parseHistoryItem(historyItem));
			}
			store.setData({ items, hasReachedEnd, hasReachedLastSyncDate });
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load HBO Go history.', err as Error);
				await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
			throw err;
		}
	}

	async getHistoryMetadata(historyItems: HboGoHistoryItem[]) {
		if (!this.checkParams(this.apiParams)) {
			throw new Error('Invalid API params');
		}
		const historyItemsWithMetadata: HboGoHistoryItemWithMetadata[] = [];
		for (const historyItem of historyItems) {
			const responseText = await Requests.send({
				url: this.CONTENT_URL.replace(/{contentId}/i, historyItem.Id),
				method: 'GET',
			});
			const historyItemWithMetadata = JSON.parse(responseText) as HboGoMetadataItem;
			historyItemsWithMetadata.push({
				...historyItemWithMetadata,
				...historyItem,
			});
		}
		return historyItemsWithMetadata;
	}

	parseHistoryItem(historyItem: HboGoHistoryItemWithMetadata) {
		let item: Item;
		const serviceId = this.id;
		const { Id: id, ProductionYear: year, ElapsedPercentage: progress } = historyItem;
		if (historyItem.Category === 'Series') {
			const type = 'show';
			const title = historyItem.SeriesName.trim();
			const { SeasonIndex: season, Index: episode } = historyItem;
			const episodeTitle = historyItem.Name.trim();
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				season,
				episode,
				episodeTitle,
				progress,
			});
		} else {
			const type = 'movie';
			const title = historyItem.Name.trim();
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				progress,
			});
		}
		return item;
	}

	async getItem(id: string): Promise<Item | null> {
		let item: Item | null = null;
		if (!this.isActivated) {
			await this.activate();
		}
		if (!this.checkParams(this.apiParams)) {
			throw new Error('Invalid API params');
		}
		try {
			const responseText = await Requests.send({
				url: this.CONTENT_URL.replace(/{contentId}/i, id),
				method: 'GET',
			});
			item = this.parseHistoryItem(JSON.parse(responseText) as HboGoMetadataItem);
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	getApiParams(): Promise<Partial<HboGoApiParams> | null> {
		return ScriptInjector.inject<Partial<HboGoApiParams>>(
			this.id,
			'api-params',
			this.ACCOUNT_URL,
			() => {
				let swVersion, token;
				const tokenStr = window.localStorage.getItem('go-token');
				if (tokenStr) {
					const tokenObj = JSON.parse(tokenStr) as HboGoTokenObj;
					swVersion = tokenObj.sdkVersion;
					token = tokenObj.data;
				}
				return { swVersion, token };
			}
		);
	}
}

export const HboGoApi = new _HboGoApi();

registerApi('hbo-go', HboGoApi);
