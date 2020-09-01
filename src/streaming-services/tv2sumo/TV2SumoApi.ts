import * as moment from 'moment';
import { Item } from '../../models/Item';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { Api } from '../common/Api';
import { Requests } from '../../common/Requests';
import { getSyncStore, registerApi } from '../common/common';

interface TV2SumoHistoryItem {
	id: number;
	date: number;
	asset: TV2SumoInfo;
	season: TV2SumoInfo;
	show: TV2SumoInfo;
}

interface TV2SumoInfo {
	id: number;
	title: string;
	path: string;
}

type TV2SumoMetadataResponse = TV2SumoMetadataResponseEpisode|TV2SumoMetadataResponseMovie;

interface TV2SumoMetadataResponseEpisode {
	id: number;
	title: string;
	asset_type: "episode"
	episode_number: number;
	episode_title: string;
	season_number: number;
	show: {
		id: number;
		title: string;
	}
}

interface TV2SumoMetadataResponseMovie {
	id: number;
	title: string;
	asset_type: "movie";
}

type TV2SumoHistoryItemWithMetadata = TV2SumoMetadataResponse & {
	date: number;
}


class _TV2SumoApi extends Api {
  HOST_URL: string;
  HISTORY_API_URL: string;

  constructor() {
  	super("tv2sumo");
    this.HOST_URL = 'https://sumo.tv2.no';
    this.HISTORY_API_URL = `${this.HOST_URL}/rest/user/viewinghistory`;

    this.loadHistory = this.loadHistory.bind(this);
    this.parseHistoryItem = this.parseHistoryItem.bind(this);
    this.loadTraktHistory = this.loadTraktHistory.bind(this);
    this.loadTraktItemHistory = this.loadTraktItemHistory.bind(this);
  }

  loadHistory = async (nextPage: number, nextVisualPage: number, itemsToLoad: number) => {
    try {
      let isLastPage = false;
      let items: Item[] = [];
      const historyItems: TV2SumoHistoryItem[] = [];
      do {
        const responseText = await Requests.send({
          url: `${this.HISTORY_API_URL}?size=10&start=${nextPage}`, //TODO map from pageNumber to size
          method: 'GET',
        });
        const responseJson: TV2SumoHistoryItem[] = JSON.parse(responseText);
        if (responseJson && responseJson.length > 0) {
          itemsToLoad -= responseJson.length;
          historyItems.push(...responseJson);
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
      getSyncStore("tv2sumo").update({isLastPage, nextPage, nextVisualPage, items});
    } catch (err) {
      Errors.error('Failed to load TV2 Sumo history.', err);
      await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR',  null,{error: err});
    }
  };

  getHistoryMetadata = async (historyItems: TV2SumoHistoryItem[]): Promise<TV2SumoHistoryItemWithMetadata[]> => Promise.all(historyItems.map(async historyItem => {
		const responseText = await Requests.send({
			url: `${this.HOST_URL}/rest/assets/${historyItem.id}`,
			method: 'GET'
		});
		const responseJson: TV2SumoMetadataResponse = JSON.parse(responseText);
		if (responseJson) {
			return Object.assign({ date: historyItem.date }, responseJson);
		} else {
			throw responseText;
		}
	}));

  parseHistoryItem = (historyItem: TV2SumoHistoryItemWithMetadata): Item => {
    let item: Item;
    const id = historyItem.id+"";
    const year: number =  0; //TODO
    const watchedAt = moment(historyItem.date);
    if (historyItem.asset_type === 'episode') {
      const title = historyItem.show.title.trim();
      const season = historyItem.season_number;
      const episode = historyItem.episode_number;
      const episodeTitle = historyItem.episode_title.trim();
      item = new Item({
        id,
        type: 'show',
        title,
        year,
        season,
        episode,
        episodeTitle,
        isCollection: false,
        watchedAt
      });
    } else {
      const title = historyItem.title.trim();
      item = new Item({id, type: 'movie', title, year, watchedAt});
    }
    return item;
  };
}

export const TV2SumoApi = new _TV2SumoApi();

registerApi('tv2sumo', TV2SumoApi);
