import { Requests } from '@common/Requests';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { EpisodeItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { Utils } from '@common/Utils';
import { Cache, CacheItem } from '@common/Cache';
import { DiscoveryplusService } from '@/discoveryplus/DiscoveryplusService';

export interface DiscoveryplusSession extends ServiceApiSession {
	profileName: string;
}

export interface DiscoveryplusHistoryItem {
	id: string;
	attributes: {
		seasonNumber: number;
		episodeNumber: number;
		name: string;
		videoType: string;
		airDate: string;
		firstAvailableDate: string;
		viewingHistory: {
			viewed: boolean;
			completed?: boolean;
			lastReportedTimestamp?: string;
		};
	};
	relationships: { show: { data: { id: string; type: string } } };
}

export interface DiscoveryplusProfileData {
	data: { attributes: { profileName: string } };
}

export interface DiscoveryplusRouting {
	homeMarket: string;
	env: string;
	tenant: string;
	domain: string;
}

export interface CachedRouting {
	routing?: DiscoveryplusRouting;
	timestamp: number;
}

class _DiscoveryplusApi extends ServiceApi {
	public session: DiscoveryplusSession | null = null;
	public hasReachedHistoryEnd = false;
	public currentHistoryPage = 1;
	public showIdsParam = '';
	public showNameMap: Record<string, string> = {};
	public isActivated = false;

	private API_URL = 'https://default.any-any.prd.api.discoveryplus.com';
	private PROFILE_URL = `${this.API_URL}/users/me/profiles/selected`;
	private ALLSHOWS_URL =
		`${this.API_URL}/cms/routes/my-stuff?include=default&decorators=viewingHistory,isFavorite,contentAction,badges&page[items.size]=100`;

	constructor() {
		super(DiscoveryplusService.id);
	}

	/* ---------------- API ROUTING ---------------- */

	private async initApiUrl(): Promise<void> {
		const env = 'prd';
		const domain = 'api.discoveryplus.com';
		const cacheKey = 'servicesData';
		const ttl = 7 * 24 * 60 * 60 * 1000;

		const cacheItem: CacheItem<'servicesData'> | undefined = await Cache.get(cacheKey);
		const cached = cacheItem?.get(this.id) as CachedRouting | undefined;

		if (cached?.routing && Date.now() - cached.timestamp < ttl) {
			this.applyRouting(cached.routing);
			return;
		}

		const bootstrapUrl = `https://default.any-any.${env}.${domain}/session-context/headwaiter/v1/bootstrap`;

		const responseText = await Requests.send({
			url: bootstrapUrl,
			method: 'POST',
			headers: {
				'x-disco-client': 'WEB:10.15.7:dplus:6.3.0',
				'x-disco-params': 'realm=bolt,bid=dplus,features=ar',
			},
			body: '{}',
		});

		const bootstrap = JSON.parse(responseText) as { routing?: DiscoveryplusRouting };
		if (!bootstrap.routing) throw new Error('Invalid bootstrap');

		this.applyRouting(bootstrap.routing);
		cacheItem?.set(this.id, { routing: bootstrap.routing, timestamp: Date.now() });
	}

	private applyRouting(routing: DiscoveryplusRouting): void {
		this.API_URL = `https://default.${routing.tenant}-${routing.homeMarket}.${routing.env}.${routing.domain}`;
		this.PROFILE_URL = `${this.API_URL}/users/me/profiles/selected`;
		this.ALLSHOWS_URL = `${this.API_URL}/cms/routes/my-stuff?include=default&decorators=viewingHistory,isFavorite,contentAction,badges&page[items.size]=100`;
	}

	/* ---------------- SESSION ---------------- */

	async activate(): Promise<void> {
		try {
			await this.initApiUrl();
			const response = await Requests.send({ url: this.PROFILE_URL, method: 'GET' });
			const profileData = JSON.parse(response) as DiscoveryplusProfileData;

			this.session = { profileName: profileData.data.attributes.profileName };
			this.isActivated = true;
		} catch (err) {
			console.error('Activation failed:', err);
			this.session = null;
		}
	}

	async checkLogin(): Promise<boolean> {
		if (!this.isActivated) await this.activate();
		return !!this.session?.profileName;
	}

	/* ---------------- SHOW LIST ---------------- */

	private async fetchSeriesShowIds(): Promise<string[]> {
		const responseText = await Requests.send({ url: this.ALLSHOWS_URL, method: 'GET' });

		const allShowsResponse = JSON.parse(responseText) as {
			included?: Array<{ id: string; attributes?: { showType?: string; name?: string } }>;
		};

		const showIds =
			allShowsResponse.included
				?.filter((item) => item.attributes?.showType === 'SERIES')
				.map((item) => {
					if (item.attributes?.name) {
						this.showNameMap[item.id] = item.attributes.name;
					}
					return item.id;
				}) ?? [];

		return showIds;
	}

	/* ---------------- HISTORY PAGING ---------------- */

	private async loadNextHistoryPage(): Promise<DiscoveryplusHistoryItem[]> {
		if (!this.showIdsParam) throw new Error('No show IDs set');

		const params = new URLSearchParams({
			decorators: 'viewingHistory',
			'filter[videoType]': 'EPISODE',
			'filter[show.id]': `${this.showIdsParam}`,
			'page[size]': '100',
			'page[number]': `${this.currentHistoryPage}`,
		});

		const historyApiUrl = new URL(`${this.API_URL}/content/videos`);
		historyApiUrl.search = params.toString();

		const responseText = await Requests.send({
			url: historyApiUrl.toString(),
			method: 'GET',
		});

		const responseJson = JSON.parse(responseText) as {
			data: DiscoveryplusHistoryItem[];
			meta: { totalPages: number };
		};

		const historyItems = responseJson?.data ?? [];
		const totalPages = responseJson?.meta?.totalPages ?? 1;

		this.hasReachedHistoryEnd = this.currentHistoryPage >= totalPages;
		this.currentHistoryPage++;

		return historyItems;
	}

	async loadHistoryForShow(showId: string): Promise<DiscoveryplusHistoryItem[]> {
		this.showIdsParam = showId;
		this.currentHistoryPage = 1;
		this.hasReachedHistoryEnd = false;

		const items: DiscoveryplusHistoryItem[] = [];

		while (!this.hasReachedHistoryEnd) {
			const pageItems = await this.loadNextHistoryPage();
			items.push(...pageItems);
		}

		return items;
	}

	/* ---------------- LOAD ALL HISTORY ---------------- */

	async loadHistoryItems(): Promise<DiscoveryplusHistoryItem[]> {
		if (!this.isActivated) await this.activate();
		if (!this.session) throw new Error('Invalid API session');

		const showIds = await this.fetchSeriesShowIds();
		if (!showIds.length) return [];

		const allHistoryItems: DiscoveryplusHistoryItem[] = [];

		// Limited concurrency batching
		const concurrency = 5;

		for (let i = 0; i < showIds.length; i += concurrency) {
			const batch = showIds.slice(i, i + concurrency);

			const results = await Promise.all(batch.map((id) => this.loadHistoryForShow(id)));

			for (const items of results) {
				allHistoryItems.push(...items);
			}
		}

		// Filter watched episodes
		const viewedEpisodes = allHistoryItems.filter(
			(i) => i.attributes.videoType === 'EPISODE' && i.attributes.viewingHistory.viewed
		);

		// Sort entire combined list by watched date
		viewedEpisodes.sort((a, b) => {
			const t1 = Utils.unix(
				a.attributes.viewingHistory?.lastReportedTimestamp ?? a.attributes.airDate
			);
			const t2 = Utils.unix(
				b.attributes.viewingHistory?.lastReportedTimestamp ?? b.attributes.airDate
			);
			return t2 - t1;
		});

		return viewedEpisodes;
	}

	/* ---------------- CONVERT TO SCROBBLES ---------------- */

	async convertHistoryItems(historyItems: DiscoveryplusHistoryItem[]): Promise<ScrobbleItem[]> {
		const items: ScrobbleItem[] = [];

		for (const ep of historyItems) {
			const showId = ep.relationships.show.data.id ?? '';
			const showName = this.showNameMap[showId] ?? 'Unknown Show';

			const watchedAt = Utils.unix(
				ep.attributes.viewingHistory?.lastReportedTimestamp ?? ep.attributes.airDate
			);

			items.push(
				new EpisodeItem({
					serviceId: this.id,
					id: ep.id,
					title: ep.attributes.name,
					season: ep.attributes.seasonNumber,
					number: ep.attributes.episodeNumber,
					year: new Date(ep.attributes.airDate ?? ep.attributes.firstAvailableDate).getFullYear(),
					watchedAt,
					progress: ep.attributes.viewingHistory?.completed ? 100 : 0,
					show: {
						serviceId: this.id,
						id: showId,
						title: showName,
					},
				})
			);
		}

		return items;
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: DiscoveryplusHistoryItem): void {
		item.watchedAt = Utils.unix(
			historyItem.attributes.viewingHistory?.lastReportedTimestamp ?? historyItem.attributes.airDate
		);

		item.progress = historyItem.attributes.viewingHistory?.completed ? 100 : 0;
	}

	isNewHistoryItem(historyItem: DiscoveryplusHistoryItem, lastSync: number): boolean {
		return (
			Utils.unix(
				historyItem.attributes.viewingHistory?.lastReportedTimestamp ??
					historyItem.attributes.airDate
			) > lastSync
		);
	}

	getHistoryItemId(historyItem: DiscoveryplusHistoryItem): string {
		return historyItem.id;
	}

	async getItem(id: string): Promise<ScrobbleItem | null> {
		const allItems = await this.convertHistoryItems(await this.loadHistoryItems());

		return allItems.find((i) => i.id === id) ?? null;
	}
}

export const DiscoveryplusApi = new _DiscoveryplusApi();
