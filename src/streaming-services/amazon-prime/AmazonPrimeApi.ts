import { Item } from '../../models/Item';
import { Errors } from '../../common/Errors';
import { RequestException, Requests } from '../../common/Requests';
import { Api } from '../common/Api';
import { registerApi } from '../common/common';

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

class _AmazonPrimeApi extends Api {
	API_URL: string;

	constructor() {
		super('amazon-prime');

		this.API_URL = 'https://atv-ps.primevideo.com';
	}

	loadHistory = (itemsToLoad: number, lastSync: number, lastSyncId: string): Promise<void> => {
		return Promise.resolve();
	};

	getItem = async (id: string): Promise<Item | undefined> => {
		let item: Item | undefined;
		try {
			const responseText = await Requests.send({
				url: `${this.API_URL}/cdp/catalog/GetPlaybackResources?asin=${id}&consumptionType=Streaming&desiredResources=CatalogMetadata&deviceID=21de9f61b9ea631b704325f9bb991dd53891cdebfddeb6c73ce1efad&deviceTypeID=AOAGZA014O5RE&firmware=1&gascEnabled=true&resourceUsage=CacheResources&videoMaterialType=Feature&titleDecorationScheme=primary-content&uxLocale=en_US`,
				method: 'GET',
			});
			item = this.parseMetadata(JSON.parse(responseText) as AmazonPrimeMetadataItem);
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to get item.', err);
			}
		}
		return item;
	};

	parseMetadata = (metadata: AmazonPrimeMetadataItem): Item => {
		let item: Item;
		const serviceId = this.id;
		const { catalog, family } = metadata.catalogMetadata;
		const { id, entityType } = catalog;
		const type = entityType === 'TV Show' ? 'show' : 'movie';
		const year = 0;
		if (type === 'show') {
			let title = '';
			let season;
			if (family) {
				const [seasonInfo, showInfo] = family.tvAncestors;
				title = showInfo.catalog.title;
				season = seasonInfo.catalog.seasonNumber;
			}
			const { episodeNumber: episode, title: episodeTitle } = catalog;
			const isCollection = false;
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				isCollection,
				season,
				episode,
				episodeTitle,
			});
		} else {
			const { title } = catalog;
			item = new Item({ serviceId, id, type, title, year });
		}
		return item;
	};
}

export const AmazonPrimeApi = new _AmazonPrimeApi();

registerApi('amazon-prime', AmazonPrimeApi);
