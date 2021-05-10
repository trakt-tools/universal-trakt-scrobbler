import { BrowserStorage } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { RequestException, Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { Tabs } from '../../common/Tabs';
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
	hasInjectedApiParamsScript: boolean;
	hasInjectedSessionScript: boolean;
	apiParamsListener: ((event: Event) => void) | null;
	sessionListener: ((event: Event) => void) | null;

	constructor() {
		super('hbo-go');

		this.isActivated = false;
		this.apiParams = {};
		this.hasInjectedApiParamsScript = false;
		this.hasInjectedSessionScript = false;
		this.apiParamsListener = null;
		this.sessionListener = null;
	}

	activate = async () => {
		let apiParams: Partial<HboGoApiParams> | undefined;
		if (Shared.pageType === 'content') {
			apiParams = await this.getApiParams();
		}
		if (!apiParams || !this.checkParams(apiParams)) {
			const { hboGoApiParams } = await BrowserStorage.get('hboGoApiParams');
			apiParams = hboGoApiParams;
		}
		if (!apiParams || !this.checkParams(apiParams)) {
			// To make calls for the API, we need the user's token, which is not available through fetch requests. Therefore we need to create a new HBO Go tab and inject a script into it to retrieve the token.
			const tab = await Tabs.open(this.ACCOUNT_URL, { active: false });
			if (!tab?.id) {
				throw new Error('Failed to activate API');
			}
			await browser.tabs.executeScript(tab.id, {
				file: '/js/lib/browser-polyfill.js',
				runAt: 'document_end',
			});
			await browser.tabs.executeScript(tab.id, {
				file: '/js/hbo-go.js',
				runAt: 'document_end',
			});
			const port = browser.tabs.connect(tab.id);
			apiParams = await new Promise((resolve) => {
				port.onMessage.addListener((apiParams) => {
					if (tab.id) {
						void browser.tabs.remove(tab.id);
					}
					if (apiParams && this.checkParams(apiParams)) {
						void BrowserStorage.set({ hboGoApiParams: apiParams }, false);
					}
					resolve(apiParams);
				});
			});
		}
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
	};

	checkParams = (apiParams: Partial<HboGoApiParams>): apiParams is HboGoApiParams => {
		return typeof apiParams.swVersion !== 'undefined' && typeof apiParams.token !== 'undefined';
	};

	loadHistory = async (
		itemsToLoad: number,
		lastSync: number,
		lastSyncId: string
	): Promise<void> => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			if (!this.checkParams(this.apiParams)) {
				throw new Error('Invalid API params');
			}
			const store = getSyncStore('hbo-go');
			let { hasReachedEnd } = store.data;
			let items: Item[] = [];
			const historyItems = [];
			do {
				const responseText = await Requests.send({
					url: this.HISTORY_URL,
					headers: {
						'GO-Token': this.apiParams.token,
					},
					method: 'GET',
				});
				const responseJson = JSON.parse(responseText) as HboGoHistoryResponse;
				if (responseJson) {
					const responseItems = responseJson.Container[0]?.Contents.Items;
					if (responseItems && responseItems.length > 0) {
						let filteredItems = [];
						if (lastSync > 0 && lastSyncId) {
							for (const responseItem of responseItems) {
								if (responseItem.Id && responseItem.Id !== lastSyncId) {
									filteredItems.push(responseItem);
								} else {
									break;
								}
							}
						} else {
							filteredItems = responseItems;
						}
						itemsToLoad -= filteredItems.length;
						historyItems.push(...filteredItems);
					}
				}
				hasReachedEnd = true;
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				const historyItemsWithMetadata = await this.getHistoryMetadata(historyItems);
				items = historyItemsWithMetadata.map(this.parseHistoryItem);
			}
			store.setData({ items, hasReachedEnd });
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load HBO Go history.', err as Error);
				await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
			throw err;
		}
	};

	getHistoryMetadata = async (historyItems: HboGoHistoryItem[]) => {
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
	};

	parseHistoryItem = (historyItem: HboGoHistoryItemWithMetadata) => {
		let item: Item;
		const serviceId = this.id;
		const { Id: id, ProductionYear: year, ElapsedPercentage: percentageWatched } = historyItem;
		if (historyItem.Category === 'Series') {
			const type = 'show';
			const title = historyItem.SeriesName.trim();
			const { SeasonIndex: season, Index: episode } = historyItem;
			const episodeTitle = historyItem.Name.trim();
			const isCollection = false;
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				season,
				episode,
				episodeTitle,
				isCollection,
				percentageWatched,
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
				percentageWatched,
			});
		}
		return item;
	};

	getItem = async (id: string): Promise<Item | undefined> => {
		let item: Item | undefined;
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
	};

	getApiParams = (): Promise<Partial<HboGoApiParams>> => {
		return new Promise((resolve) => {
			if ('wrappedJSObject' in window && window.wrappedJSObject) {
				// Firefox wraps page objects, so we can access the global hbo object by unwrapping it.
				let swVersion, token;
				const { localStorage } = window.wrappedJSObject;
				const tokenStr = localStorage.getItem('go-token');
				if (tokenStr) {
					const tokenObj = JSON.parse(tokenStr) as HboGoTokenObj;
					swVersion = tokenObj.sdkVersion;
					token = tokenObj.data;
				}
				resolve({ swVersion, token });
			} else {
				// Chrome does not allow accessing page objects from extensions, so we need to inject a script into the page and exchange messages in order to access the global hbo object.
				if (!this.hasInjectedApiParamsScript) {
					const script = document.createElement('script');
					script.textContent = `
						window.addEventListener('uts-getApiParams', () => {
							let swVersion, token;
							const { localStorage } = window;
							const tokenStr = localStorage.getItem('go-token');
							if (tokenStr) {
								const tokenObj = JSON.parse(tokenStr);
								swVersion = tokenObj.sdkVersion;
								token = tokenObj.data;
							}
							const event = new CustomEvent('uts-onApiParamsReceived', {
								detail: { swVersion, token },
							});
							window.dispatchEvent(event);
						});
					`;
					document.body.appendChild(script);
					this.hasInjectedApiParamsScript = true;
				}
				if (this.apiParamsListener) {
					window.removeEventListener('uts-onApiParamsReceived', this.apiParamsListener);
				}
				this.apiParamsListener = (event: Event) =>
					resolve((event as CustomEvent<Partial<HboGoApiParams>>).detail);
				window.addEventListener('uts-onApiParamsReceived', this.apiParamsListener, false);
				const event = new CustomEvent('uts-getApiParams');
				window.dispatchEvent(event);
			}
		});
	};

	getSession = (): Promise<HboGoSession | undefined | null> => {
		return new Promise((resolve) => {
			if ('wrappedJSObject' in window && window.wrappedJSObject) {
				// Firefox wraps page objects, so we can access the global netflix object by unwrapping it.
				let session: HboGoSession | undefined | null;
				const { sdk } = window.wrappedJSObject;
				if (sdk) {
					const videoId = sdk.player.content?.Id;
					const currentPlayback = sdk.player.currentPlaybackProgress.source.value;
					const progress = currentPlayback.progressPercent;
					const progressMs = currentPlayback.progressMs;
					session =
						videoId && typeof progress !== 'undefined' && typeof progressMs !== 'undefined'
							? { videoId, progress, progressMs }
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
							const { sdk } = window;
							if (sdk) {
								const videoId = sdk.player.content?.Id;
								const currentPlayback = sdk.player.currentPlaybackProgress.source.value;
								const progress = currentPlayback.progressPercent;
								const progressMs = currentPlayback.progressMs;
								session =
									videoId && typeof progress !== 'undefined' && typeof progressMs !== 'undefined'
										? { videoId, progress, progressMs }
										: null;
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
