import * as moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { Events, EventDispatcher } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { TV2SumoStore } from './TV2SumoStore';
import { Api } from '../common/api';

class _TV2SumoApi implements Api {
  HOST_URL: string;
  HISTORY_API_URL: string;

  constructor() {
    this.HOST_URL = 'https://sumo.tv2.no';
    this.HISTORY_API_URL = `${this.HOST_URL}/rest/user/viewinghistory`;

    this.loadHistory = this.loadHistory.bind(this);
    this.parseHistoryItem = this.parseHistoryItem.bind(this);
    this.loadTraktHistory = this.loadTraktHistory.bind(this);
    this.loadTraktItemHistory = this.loadTraktItemHistory.bind(this);
  }

  async loadHistory(nextPage: number, nextVisualPage: number, itemsToLoad: number) {
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
      TV2SumoStore.update({isLastPage, nextPage, nextVisualPage, items})
        .then(this.loadTraktHistory);
    } catch (err) {
      Errors.error('Failed to load TV2 Sumo history.', err);
      await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, {error: err});
    }
  }

  async getHistoryMetadata(historyItems: TV2SumoHistoryItem[]): Promise<TV2SumoHistoryItemWithMetadata[]> {
    return Promise.all(historyItems.map(async historyItem => {
      const responseText = await Requests.send({
        url: `${this.HOST_URL}/rest/assets/${historyItem.id}`,
        method: 'GET'
      });
      const responseJson: TV2SumoMetadataResponse = JSON.parse(responseText);
      if (responseJson) {
        return Object.assign({date: historyItem.date}, responseJson);
      } else {
        throw responseText;
      }
    }));
  }

  parseHistoryItem(historyItem: TV2SumoHistoryItemWithMetadata): Item {
    let item: Item = null;
    const id = historyItem.id;
    const type = historyItem.asset_type === 'episode' ? 'show' : 'movie';
    const year:number =  null;
    const percentageWatched = historyItem.progress;
    const watchedAt = moment(historyItem.date);
    if (type === 'show') {
      const title = historyItem.show.title.trim();
      const season = historyItem.season_number;
      const episode = historyItem.episode_number;
      const episodeTitle = historyItem.episode_title.trim();
      item = new Item({
        id,
        type,
        title,
        year,
        season,
        episode,
        episodeTitle,
        isCollection: false,
        percentageWatched,
        watchedAt
      });
    } else {
      const title = historyItem.title.trim();
      item = new Item({id, type, title, year, percentageWatched, watchedAt});
    }
    return item;
  }

  async loadTraktHistory() {
    try {
      let promises = [];
      const items = TV2SumoStore.data.items;
      promises = items.map(this.loadTraktItemHistory);
      await Promise.all(promises);
      await TV2SumoStore.update(null);
    } catch (err) {
      Errors.error('Failed to load Trakt history.', err);
      await EventDispatcher.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, {error: err});
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

const TV2SumoApi = new _TV2SumoApi();

export { TV2SumoApi };
