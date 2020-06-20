import * as moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { Events, EventDispatcher } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { NetflixStore } from './NetflixStore';
import { Api } from '../common/api';

class _NetflixApi implements Api {
	HOST_URL: string;
	API_URL: string;
	ACTIVATE_URL: string;
	AUTH_REGEX: RegExp;
	BUILD_IDENTIFIER_REGEX: RegExp;
	isActivated: boolean;
	authUrl: string;
	buildIdentifier: string;
	constructor() {
		this.HOST_URL = 'https://www.netflix.com';
		this.API_URL = `${this.HOST_URL}/api/shakti`;
		this.ACTIVATE_URL = `${this.HOST_URL}/Activate`;
		this.AUTH_REGEX = /"authURL":"(.*?)"/;
		this.BUILD_IDENTIFIER_REGEX = /"BUILD_IDENTIFIER":"(.*?)"/;

		this.isActivated = false;
		this.authUrl = '';
		this.buildIdentifier = '';

		this.extractAuthUrl = this.extractAuthUrl.bind(this);
		this.extractBuildIdentifier = this.extractBuildIdentifier.bind(this);
		this.activate = this.activate.bind(this);
		this.loadHistory = this.loadHistory.bind(this);
		this.getHistoryMetadata = this.getHistoryMetadata.bind(this);
		this.parseHistoryItem = this.parseHistoryItem.bind(this);
		this.loadTraktHistory = this.loadTraktHistory.bind(this);
		this.loadTraktItemHistory = this.loadTraktItemHistory.bind(this);
	}

	extractAuthUrl(text: string) {
		return text.match(this.AUTH_REGEX)[1];
	}

	extractBuildIdentifier(text: string) {
		return text.match(this.BUILD_IDENTIFIER_REGEX)[1];
	}

	async activate() {
		const responseText = await Requests.send({
			url: this.ACTIVATE_URL,
			method: 'GET',
		});
		this.authUrl = this.extractAuthUrl(responseText);
		this.buildIdentifier = this.extractBuildIdentifier(responseText);
		this.isActivated = true;
	}

	async loadHistory(nextPage: number, nextVisualPage: number, itemsToLoad: number) {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			let isLastPage = false;
			let items: Item[] = [];
			const historyItems: NetflixHistoryItem[] = [];
			do {
				const responseText = await Requests.send({
					url: `${this.API_URL}/${this.buildIdentifier}/viewingactivity?languages=en-US&authURL=${this.authUrl}&pg=${nextPage}`,
					method: 'GET',
				});
				const responseJson: NetflixHistoryResponse = JSON.parse(responseText);
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
			NetflixStore.update({ isLastPage, nextPage, nextVisualPage, items }).then(
				this.loadTraktHistory
			);
		} catch (err) {
			Errors.error('Failed to load Netflix history.', err);
			await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, { error: err });
		}
	}

	async getHistoryMetadata(historyItems: NetflixHistoryItem[]) {
		let historyItemsWithMetadata: NetflixHistoryItemWithMetadata[] = [];
		const responseText = await Requests.send({
			url: `${this.API_URL}/${this.buildIdentifier}/pathEvaluator?languages=en-US`,
			method: 'POST',
			body: `authURL=${this.authUrl}&${historyItems
				.map((historyItem) => `path=["videos",${historyItem.movieID},["releaseYear","summary"]]`)
				.join('&')}`,
		});
		const responseJson: NetflixMetadataResponse = JSON.parse(responseText);
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
	}

	isShow(
		historyItem: NetflixHistoryItemWithMetadata
	): historyItem is NetflixHistoryShowItemWithMetadata {
		return 'series' in historyItem;
	}

	parseHistoryItem(historyItem: NetflixHistoryItemWithMetadata) {
		let item: Item = null;
		const id = historyItem.movieID;
		const type = 'series' in historyItem ? 'show' : 'movie';
		const year = historyItem.releaseYear || null;
		const watchedAt = moment(historyItem.date);
		if (this.isShow(historyItem)) {
			const title = historyItem.seriesTitle.trim();
			let season = null;
			let episode = null;
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
	}

	async loadTraktHistory() {
		try {
			let promises = [];
			const items = NetflixStore.data.items;
			promises = items.map(this.loadTraktItemHistory);
			await Promise.all(promises);
			await NetflixStore.update(null);
		} catch (err) {
			Errors.error('Failed to load Trakt history.', err);
			await EventDispatcher.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, { error: err });
		}
	}

	async loadTraktItemHistory(item: Item) {
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
	}
}

const NetflixApi = new _NetflixApi();

export { NetflixApi };
