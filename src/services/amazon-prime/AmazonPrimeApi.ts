import { AmazonPrimeService } from '@/amazon-prime/AmazonPrimeService';
import { ServiceApi } from '@apis/ServiceApi';
import { Errors } from '@common/Errors';
import { RequestException, Requests } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { Item } from '@models/Item';

export interface AmazonPrimeApiParams {
	deviceId: string;
}

export interface AmazonPrimeMetadataItem {
	catalogMetadata: {
		catalog: {
			entityType: 'TV Show' | 'Movie';
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
	API_URL = 'https://atv-ps.primevideo.com';
	SETTINGS_URL = 'https://www.primevideo.com/settings';
	ITEM_URL = '';
	NEXT_ITEM_URL = '';

	isActivated = false;
	apiParams: AmazonPrimeApiParams = {
		deviceId: '',
	};
	nextItemId = '';

	constructor() {
		super(AmazonPrimeService.id);
	}

	async activate() {
		const apiParams = await this.getApiParams();
		if (!apiParams || !apiParams.deviceId) {
			throw new Error('Failed to activate API');
		}

		this.apiParams = apiParams;

		this.ITEM_URL = `${this.API_URL}/cdp/catalog/GetPlaybackResources?asin={id}&consumptionType=Streaming&desiredResources=CatalogMetadata&deviceID=${this.apiParams.deviceId}&deviceTypeID=AOAGZA014O5RE&firmware=1&gascEnabled=true&resourceUsage=CacheResources&videoMaterialType=Feature&titleDecorationScheme=primary-content&uxLocale=en_US`;
		this.NEXT_ITEM_URL = `${this.API_URL}/cdp/discovery/GetSections?decorationScheme=none&deviceID=${this.apiParams.deviceId}&deviceTypeID=AOAGZA014O5RE&firmware=1&gascEnabled=true&pageId={id}&pageType=player&sectionTypes=bottom&uxLocale=en_US&version=default`;

		this.isActivated = true;
	}

	async getItem(id: string): Promise<Item | null> {
		let item: Item | null = null;
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

			// Since there's no way to get the next item ID when the user clicks the 'Next episode' button or when it autoplays the next episode, we use this endpoint to get the ID beforehand so it can be used by the parser when/if the next episode plays
			const nextItemResponseText = await Requests.send({
				url: this.NEXT_ITEM_URL.replace(/{id}/i, id),
				method: 'GET',
			});
			const nextItemResponse = JSON.parse(nextItemResponseText) as AmazonPrimeNextItemResponse;
			this.nextItemId =
				nextItemResponse.sections.bottom?.collections.collectionList[0].items.itemList[0].titleId ??
				'';
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	parseMetadata(metadata: AmazonPrimeMetadataItem): Item {
		let item: Item;
		const serviceId = this.id;
		const { catalog, family } = metadata.catalogMetadata;
		const { id, entityType } = catalog;
		const type = entityType === 'TV Show' ? 'show' : 'movie';
		if (type === 'show') {
			let title = '';
			let season;
			if (family) {
				const [seasonInfo, showInfo] = family.tvAncestors;
				title = showInfo.catalog.title;
				season = seasonInfo.catalog.seasonNumber;
			}
			const { episodeNumber: episode, title: episodeTitle } = catalog;
			item = new Item({
				serviceId,
				id,
				type,
				title,
				season,
				episode,
				episodeTitle,
			});
		} else {
			const { title } = catalog;
			item = new Item({
				serviceId,
				id,
				type,
				title,
			});
		}
		return item;
	}

	getApiParams(): Promise<AmazonPrimeApiParams | null> {
		return ScriptInjector.inject<AmazonPrimeApiParams>(
			this.id,
			'api-params',
			this.SETTINGS_URL,
			() => ({
				deviceId: window.localStorage.getItem('atvwebplayersdk_atvwebplayer_deviceid') ?? '',
			})
		);
	}
}

export const AmazonPrimeApi = new _AmazonPrimeApi();
