import { ViaplayService } from '@/viaplay/ViaplayService';
import { ServiceApi } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';

export interface ViaplayGlobalObject {
	storeState: {
		profiles: {
			activeProfile: string | null;
			profileList: [
				{
					id: string;
					name: string | null;
				},
			];
		};
	};
	userData: {
		firstName: string | null;
	};
}

export interface ViaplayAuthResponse {
	success: boolean;
	userData?: {
		firstName: string;
		lastName: string;
		username: string;
		userId: string;
	};
}

interface ViaplayProfile {
	id: string;
	name: string;
	isOwner: boolean;
}

export interface ViaplayProfilesArray extends Array<ViaplayProfile> {}

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
	PROFILES_URL = '';
	PROFILES_ID = '';
	isActivated = false;

	constructor() {
		super(ViaplayService.id);
	}

	async activate(byFetch = false) {
		let viaplayUrl: Location | URL;
		if (location.hostname.includes('viaplay') && !byFetch) {
			viaplayUrl = location;
		} else {
			const response = await fetch(this.INITIAL_URL);
			viaplayUrl = new URL(response.url);
			byFetch = true;
		}
		const host = viaplayUrl.hostname;
		let { region = 'com' } = /\.(?<region>no|se|dk|fi|is|pl|ee|lv|lt)/.exec(host)?.groups ?? {};
		if (region === 'com') {
			//pathname should be something like /us-en/
			region = /\/(?<region>..)-..\//.exec(viaplayUrl.pathname)?.groups?.region || region;
			if (region === 'com') {
				if (byFetch) {
					Shared.errors.error('Unknown Viaplay region: ', new Error(viaplayUrl.href));
				} else {
					await this.activate(true);
					return;
				}
			}
		}
		this.HOST_URL = `https://content.${host}/`;
		this.API_BASE_URL = `${this.HOST_URL}pcdash-${region}/`;
		this.AUTH_URL = `https://login.${host}/api/persistentLogin/v1?deviceKey=pcdash-${region}`;
		this.PROFILES_URL = `https://${host}/profiles`;

		const authResponseText = await Requests.send({
			url: this.AUTH_URL,
			method: 'GET',
		});
		const authResponse = JSON.parse(authResponseText) as ViaplayAuthResponse;

		const responseProfilesText = await Requests.send({
			url: this.PROFILES_URL,
			method: 'GET',
		});
		const profileIdRegex = /"profiles":.*"activeProfile":"(?<activeProfileId>.*?)"/;
		const { activeProfileId = '' } = profileIdRegex.exec(responseProfilesText)?.groups ?? {};
		this.PROFILES_ID = activeProfileId;

		this.HISTORY_API_URL = `${this.API_BASE_URL}watched?profileId=${this.PROFILES_ID}`;
		this.nextHistoryUrl = this.HISTORY_API_URL;

		const profilesRegex = /"profilesList":(?<profilesArray>\[.*?\])/;
		const { profilesArray = '[]' } = profilesRegex.exec(responseProfilesText)?.groups ?? {};

		const profiles = JSON.parse(profilesArray) as ViaplayProfilesArray;
		const activeProfile = profiles.find(({ id }) => this.PROFILES_ID === id);

		let profileName = '';
		if (activeProfile) {
			profileName = activeProfile.name;
		}

		this.session = {
			profileName:
				profileName || authResponse.userData?.firstName || authResponse.userData?.username || null,
		};

		this.isActivated = true;
	}

	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<ViaplayProduct[]> {
		if (!this.isActivated) {
			await this.activate();
		}
		const responseText = await Requests.send({
			url: this.nextHistoryUrl,
			method: 'GET',
			cancelKey,
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
		this.nextHistoryUrl = url + '&profileId=' + this.PROFILES_ID;
		this.hasReachedHistoryEnd = !url || responseItems.length === 0;
		return responseItems;
	}

	isNewHistoryItem(historyItem: ViaplayProduct, lastSync: number) {
		return (
			!!historyItem.user.progress?.updated &&
			Utils.unix(historyItem.user.progress.updated) > lastSync
		);
	}

	getHistoryItemId(historyItem: ViaplayProduct) {
		return historyItem.system.guid;
	}

	convertHistoryItems(historyItems: ViaplayProduct[]) {
		const items = historyItems.map((historyItem) => this.parseViaplayProduct(historyItem));
		return items;
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: ViaplayProduct): Promisable<void> {
		const progressInfo = historyItem.user.progress;
		item.watchedAt = progressInfo?.updated ? Utils.unix(progressInfo.updated) : undefined;
		item.progress = progressInfo?.elapsedPercent || 0;
	}

	parseViaplayProduct(product: ViaplayProduct): ScrobbleItem {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const year = product.content.production.year;
		const progressInfo = product.user.progress;
		const progress = progressInfo?.elapsedPercent || 0;
		const watchedAt = progressInfo?.updated ? Utils.unix(progressInfo.updated) : undefined;
		const id = product.system.guid;
		if (product.type === 'episode') {
			const content = product.content;
			const showTitle = content.originalTitle ?? content.series.title;
			const season = content.series.season.seasonNumber;
			const number = content.series.episodeNumber;
			const title = content.title !== showTitle ? content.title : content.series.episodeTitle;
			item = new EpisodeItem({
				serviceId,
				id,
				title,
				year,
				season,
				number,
				progress,
				watchedAt,
				show: {
					serviceId,
					title: showTitle,
					year,
				},
			});
		} else {
			const title = product.content.title;
			item = new MovieItem({
				serviceId,
				id,
				title,
				year,
				progress,
				watchedAt,
			});
		}
		return item;
	}

	async getItem(id: string): Promise<ScrobbleItem | null> {
		let item: ScrobbleItem | null = null;
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
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}
		return item;
	}
}

export const ViaplayApi = new _ViaplayApi();
