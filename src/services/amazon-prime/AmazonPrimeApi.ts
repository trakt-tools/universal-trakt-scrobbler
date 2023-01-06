import { AmazonPrimeService } from '@/amazon-prime/AmazonPrimeService';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { SetOptional } from 'type-fest';

export interface AmazonPrimeSession extends ServiceApiSession {}

export interface AmazonPrimeHistoryItem {
	id: string;
	progress: number;
	watchedAt: number;
}

export interface AmazonPrimeConfigResponse {
	customerConfig: {
		homeRegion: string;
	};
	territoryConfig: {
		defaultVideoWebsite: string;
	};
}

export interface AmazonPrimeProfileResponse {
	profiles: {
		id: string;
		isSelected: boolean;
		name: string;
	}[];
}

export interface AmazonPrimeHistoryResponse {
	widgets: {
		content: {
			content:
				| {
						nextToken: string;
						titles: AmazonPrimeHistoryResponseTitle[];
				  }
				| {
						header: string;
						message: string;
				  };
		};

		/**
		 * The type for the history one is `activity-history`.
		 */
		widgetType: string;
	}[];
}

export interface AmazonPrimeHistoryResponseTitle {
	/** Format: April 11, 2020 */
	date: string;

	titles: AmazonPrimeHistoryResponseItem[];
}

export interface AmazonPrimeHistoryResponseItem {
	gti: string;

	/** In milliseconds. */
	time: number;

	children: AmazonPrimeHistoryResponseItem[];
}

export interface AmazonPrimeEnrichmentsResponse {
	enrichments: Partial<
		Record<
			string,
			{
				progress?: {
					percentage: number;
				};
			}
		>
	>;
}

export interface AmazonPrimeMetadataItem {
	catalogMetadata: {
		catalog: {
			entityType: 'TV Show' | 'Movie' | 'Trailer' | 'Bonus Content';
			episodeNumber?: number;
			id: string;
			title: string;
		};
		family?: {
			tvAncestors: [
				{
					catalog: {
						seasonNumber: number;
					};
				},
				{
					catalog: {
						title: string;
					};
				}
			];
		};
	};
}

export interface AmazonPrimeNextItemResponse {
	sections: {
		bottom?: {
			collections: {
				collectionList: [
					{
						items: {
							itemList: [{ titleId: string }];
						};
					}
				];
			};
		};
	};
}

class _AmazonPrimeApi extends ServiceApi {
	HOST_URL = 'https://www.primevideo.com';
	API_URL = 'https://atv-ps.primevideo.com';
	PROFILE_URL = `${this.HOST_URL}/gp/video/api/getProfiles`;
	HISTORY_URL = `${this.HOST_URL}/gp/video/api/getWatchHistorySettingsPage?widgetArgs=%7B{args}%7D`;
	ENRICHMENTS_URL = `${this.HOST_URL}/gp/video/api/enrichItemMetadata?metadataToEnrich=%7B%22playback%22%3Atrue%7D&titleIDsToEnrich=%5B{ids}%5D`;
	CONFIG_URL = '';
	ITEM_URL = '';
	NEXT_ITEM_URL = '';

	/**
	 * These values were retrieved by watching network requests.
	 */
	DEVICE_TYPE_ID = 'AOAGZA014O5RE';

	requests = withHeaders({
		'x-requested-with': 'XMLHttpRequest',
	});

	isActivated = false;
	session?: AmazonPrimeSession | null;
	nextToken = '';
	nextItemId = '';

	constructor() {
		super(AmazonPrimeService.id);
	}

	async activate() {
		if (this.session === null) {
			return;
		}

		try {
			this.CONFIG_URL = `${this.API_URL}/cdp/usage/GetAppStartupConfig?deviceID=&deviceTypeID=${this.DEVICE_TYPE_ID}&firmware=1&gascEnabled=false&version=1`;

			try {
				const configResponseText = await Requests.send({
					url: this.CONFIG_URL,
					method: 'GET',
				});
				const configResponse = JSON.parse(configResponseText) as AmazonPrimeConfigResponse;
				const region = configResponse.customerConfig.homeRegion.toLowerCase();

				this.HOST_URL = configResponse.territoryConfig.defaultVideoWebsite;
				this.API_URL = this.HOST_URL.replace('www.', '').replace(
					'//',
					`//atv-ps${region === 'na' ? '' : `-${region}`}.`
				);
			} catch (err) {
				if (Shared.errors.validate(err)) {
					Shared.errors.log(`Failed to activate ${this.id} API`, err);
				}
				throw new Error('Failed to activate API');
			}

			this.ITEM_URL = `${this.API_URL}/cdp/catalog/GetPlaybackResources?asin={id}&consumptionType=Streaming&desiredResources=CatalogMetadata&deviceID=&deviceTypeID=${this.DEVICE_TYPE_ID}&firmware=1&gascEnabled=true&resourceUsage=CacheResources&videoMaterialType=Feature&titleDecorationScheme=primary-content&uxLocale=en_US`;
			this.NEXT_ITEM_URL = `${this.API_URL}/cdp/discovery/GetSections?decorationScheme=none&deviceID=&deviceTypeID=${this.DEVICE_TYPE_ID}&firmware=1&gascEnabled=true&pageId={id}&pageType=player&sectionTypes=bottom&uxLocale=en_US&version=default`;

			this.session = {
				profileName: null,
			};
			this.isActivated = true;
		} catch (err) {
			this.session = null;
		}

		if (!this.session) {
			return;
		}

		try {
			const profileResponseText = await this.requests.send({
				url: this.PROFILE_URL,
				method: 'GET',
			});
			const profileResponse = JSON.parse(profileResponseText) as AmazonPrimeProfileResponse;
			const profile = profileResponse.profiles.find((currentProfile) => currentProfile.isSelected);
			if (profile) {
				this.session.profileName = profile.name;
			}
		} catch (err) {
			// Do nothing
		}
	}

	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return !!this.session && !!this.session.profileName;
	}

	async loadHistoryItems() {
		if (!this.isActivated) {
			await this.activate();
		}

		const historyItems: AmazonPrimeHistoryItem[] = [];

		const historyResponseText = await this.requests.send({
			url: Utils.replace(this.HISTORY_URL, {
				args: this.nextToken ? `%22nextToken%22%3A%22${this.nextToken}%22` : '',
			}),
			method: 'GET',
		});
		const historyResponse = JSON.parse(historyResponseText) as AmazonPrimeHistoryResponse;

		const historyWidget = historyResponse.widgets.find(
			(widget) => widget.widgetType === 'watch-history'
		);
		if (historyWidget) {
			const { content } = historyWidget.content;
			if ('titles' in content) {
				const partialHistoryItems: SetOptional<AmazonPrimeHistoryItem, 'progress'>[] = [];

				const historyResponseItems = content.titles
					.map((titles) => this.flattenHistoryResponseItems(titles.titles))
					.flat();
				for (const historyResponseItem of historyResponseItems) {
					partialHistoryItems.push({
						id: historyResponseItem.gti,
						watchedAt: Utils.unix(historyResponseItem.time),
					});
				}

				const enrichmentsResponseText = await this.requests.send({
					url: Utils.replace(this.ENRICHMENTS_URL, {
						ids: partialHistoryItems
							.map((partialHistoryItem) => `%22${partialHistoryItem.id}%22`)
							.join('%2C'),
					}),
					method: 'GET',
				});
				const enrichmentsResponse = JSON.parse(
					enrichmentsResponseText
				) as AmazonPrimeEnrichmentsResponse;

				for (const partialHistoryItem of partialHistoryItems) {
					const enrichments = enrichmentsResponse.enrichments[partialHistoryItem.id];
					historyItems.push({
						...partialHistoryItem,
						progress: enrichments?.progress?.percentage ?? 0,
					});
				}

				if (content.nextToken) {
					this.nextToken = content.nextToken;
				} else {
					this.nextToken = '';
					this.hasReachedHistoryEnd = true;
				}
			} else {
				this.nextToken = '';
				this.hasReachedHistoryEnd = true;
			}
		} else {
			this.nextToken = '';
			this.hasReachedHistoryEnd = true;
		}

		return historyItems;
	}

	flattenHistoryResponseItems(
		historyResponseItems: AmazonPrimeHistoryResponseItem[]
	): AmazonPrimeHistoryResponseItem[] {
		return historyResponseItems
			.map((historyResponseItem) =>
				historyResponseItem.children.length > 0
					? this.flattenHistoryResponseItems(historyResponseItem.children)
					: historyResponseItem
			)
			.flat();
	}

	isNewHistoryItem(historyItem: AmazonPrimeHistoryItem, lastSync: number) {
		return historyItem.watchedAt > lastSync;
	}

	getHistoryItemId(historyItem: AmazonPrimeHistoryItem) {
		return historyItem.id;
	}

	async convertHistoryItems(historyItems: AmazonPrimeHistoryItem[]) {
		const items: ScrobbleItem[] = [];

		for (const historyItem of historyItems) {
			const item = await this.getItem(historyItem.id, true);
			if (item) {
				item.progress = historyItem.progress;
				item.watchedAt = Utils.unix(historyItem.watchedAt);
				items.push(item);
			}
		}

		return items;
	}

	updateItemFromHistory(
		item: ScrobbleItemValues,
		historyItem: AmazonPrimeHistoryItem
	): Promisable<void> {
		item.watchedAt = Utils.unix(historyItem.watchedAt);
		item.progress = historyItem.progress;
	}

	async getItem(id: string, isHistoryItem = false): Promise<ScrobbleItem | null> {
		let item: ScrobbleItem | null = null;
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			const responseText = await Requests.send({
				url: this.ITEM_URL.replace(/{id}/i, id),
				method: 'GET',
			});
			const metadata = JSON.parse(responseText) as AmazonPrimeMetadataItem;
			item = this.parseMetadata(metadata);

			if (!isHistoryItem) {
				// Since there's no way to get the next item ID when the user clicks the 'Next episode' button or when it autoplays the next episode, we use this endpoint to get the ID beforehand so it can be used by the parser when/if the next episode plays
				const nextItemResponseText = await Requests.send({
					url: this.NEXT_ITEM_URL.replace(/{id}/i, id),
					method: 'GET',
				});
				const nextItemResponse = JSON.parse(nextItemResponseText) as AmazonPrimeNextItemResponse;
				this.nextItemId =
					nextItemResponse.sections.bottom?.collections.collectionList[0].items.itemList[0]
						.titleId ?? '';
			}
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	parseMetadata(metadata: AmazonPrimeMetadataItem): ScrobbleItem {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const { catalog, family } = metadata.catalogMetadata;
		const { id, entityType } = catalog;

		if (entityType === 'TV Show' || entityType === 'Bonus Content') {
			let title = '';
			let season = 0;
			if (family) {
				const [seasonInfo, showInfo] = family.tvAncestors;
				title = showInfo.catalog.title;
				season = seasonInfo.catalog.seasonNumber;
			}
			const { episodeNumber: number = 0, title: episodeTitle } = catalog;
			item = new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
				season,
				number,
				show: {
					serviceId,
					title,
				},
			});
		} else {
			const { title } = catalog;
			item = new MovieItem({
				serviceId,
				id,
				title,
			});
		}
		return item;
	}
}

export const AmazonPrimeApi = new _AmazonPrimeApi();
