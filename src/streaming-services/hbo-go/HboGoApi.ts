import { BrowserStorage } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { Tabs } from '../../common/Tabs';
import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

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

export interface HboGoTokenObj {
	data: string;
}

export interface HboGoApiParams {
	token: string;
}

export interface HboGoSession {
	content: HboGoMetadataItem;
	playing: boolean;
	paused: boolean;
	progress: number;
}

export interface HboGoConfigResponse {
	ConfigurationAPIList: {
		Url: string;
	}[];
}

export interface HboGoSettingsResponse {
	CustomerGroupUrlTemplate: string;
	HistoryGroupId: string;
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

export type HboGoHistoryItem = HboGoHistoryShowItem | HboGoHistoryMovieItem;

export type HboGoHistoryShowItem = HboGoMetadataShowItem & {
	ElapsedPercentage: number;
};

export type HboGoHistoryMovieItem = HboGoMetadataMovieItem & {
	ElapsedPercentage: number;
};

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
	SW_VERSION = '120.02.152';
	HOST_URL = 'https://hbogola.com/';
	ACCOUNT_URL = `${this.HOST_URL}settings/account`;
	API_URL = 'https://globalapi.hbogola.com/v5.9';
	CONFIG_URL = `${this.API_URL}/Configuration/json/ENG/MOBI`;
	isActivated: boolean;
	groupUrl: string;
	historyGroupId: string;
	apiParams: Partial<HboGoApiParams>;
	hasInjectedApiParamsScript: boolean;
	hasInjectedSessionScript: boolean;
	apiParamsListener: ((event: Event) => void) | null;
	sessionListener: ((event: Event) => void) | null;

	constructor() {
		super('hbo-go');

		this.isActivated = false;
		this.groupUrl = '';
		this.historyGroupId = '';
		this.apiParams = {};
		this.hasInjectedApiParamsScript = false;
		this.hasInjectedSessionScript = false;
		this.apiParamsListener = null;
		this.sessionListener = null;
	}

	activate = async () => {
		// Retrieve the API URLs and other important information.
		const configResponseText = await Requests.send({
			url: this.CONFIG_URL,
			headers: {
				'GO-swVersion': this.SW_VERSION,
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
		this.groupUrl = settings.CustomerGroupUrlTemplate;
		this.historyGroupId = settings.HistoryGroupId;
		let apiParams: Partial<HboGoApiParams> | undefined;
		if (!Shared.isBackgroundPage) {
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
		this.apiParams.token = apiParams.token;
		this.isActivated = true;
	};

	checkParams = (apiParams: Partial<HboGoApiParams>): apiParams is HboGoApiParams => {
		return typeof apiParams.token !== 'undefined';
	};

	getHistoryUrl = (nextPage: number) => {
		return this.groupUrl
			.replace(/{groupId}/i, this.historyGroupId)
			.replace('{filter}', '0')
			.replace('{sort}', '0')
			.replace(/{pageIndex}/i, (nextPage + 1).toString())
			.replace(/{pageSize}/i, '20')
			.replace('{parameter}', '0')
			.replace(/{ageRating}/i, '0');
	};

	loadHistory = async (
		nextPage: number,
		nextVisualPage: number,
		itemsToLoad: number
	): Promise<void> => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			if (!this.checkParams(this.apiParams)) {
				throw new Error('Invalid API params');
			}
			let isLastPage = false;
			let items: Item[] = [];
			const historyItems = [];
			do {
				const responseText = await Requests.send({
					url: this.getHistoryUrl(nextPage),
					headers: {
						'GO-Token': this.apiParams.token,
					},
					method: 'GET',
				});
				const responseJson = JSON.parse(responseText) as HboGoHistoryResponse;
				if (responseJson) {
					const responseItems = responseJson.Container[0]?.Contents.Items;
					if (responseItems && responseItems.length > 0) {
						itemsToLoad -= responseItems.length;
						historyItems.push(...responseItems);
					} else {
						isLastPage = true;
					}
				} else {
					isLastPage = true;
				}
				nextPage += 1;
			} while (!isLastPage && itemsToLoad > 0);
			if (historyItems.length > 0) {
				items = historyItems.map(this.parseHistoryItem);
			}
			nextVisualPage += 1;
			getSyncStore('hbo-go')
				.update({ isLastPage, nextPage, nextVisualPage, items })
				.then(this.loadTraktHistory)
				.catch(() => {
					/** Do nothing */
				});
		} catch (err) {
			Errors.error('Failed to load HBO Go history.', err as Error);
			await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
				error: err as Error,
			});
		}
	};

	parseHistoryItem = (metadata: HboGoHistoryItem) => {
		const item = this.parseMetadata(metadata);
		// TODO: HBO Go doesn't offer the date where an item was watched. Implement a solution.
		item.watchedAt = undefined;
		item.percentageWatched = metadata.ElapsedPercentage;
		return item;
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

	getApiParams = (): Promise<Partial<HboGoApiParams>> => {
		return new Promise((resolve) => {
			if ('wrappedJSObject' in window && window.wrappedJSObject) {
				// Firefox wraps page objects, so we can access the global netflix object by unwrapping it.
				let token;
				const { localStorage } = window.wrappedJSObject;
				const tokenStr = localStorage.getItem('go-token');
				if (tokenStr) {
					token = (JSON.parse(tokenStr) as HboGoTokenObj).data;
				}
				resolve({ token });
			} else {
				// Chrome does not allow accessing page objects from extensions, so we need to inject a script into the page and exchange messages in order to access the global netflix object.
				if (!this.hasInjectedApiParamsScript) {
					const script = document.createElement('script');
					script.textContent = `
						window.addEventListener('uts-getApiParams', () => {
							let token;
							const { localStorage } = window.wrappedJSObject;
							const tokenStr = localStorage.getItem('go-token');
							if (tokenStr) {
								token = JSON.parse(tokenStr).data;
							}
							const event = new CustomEvent('uts-onApiParamsReceived', {
								detail: { token },
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
