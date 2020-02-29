import moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { Events, EventDispatcher } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { NrkStore } from './NrkStore';
import { Api } from '../common/api';

class _NrkApi implements Api{
  HOST_URL: string;
  HISTORY_API_URL: string;
  constructor() {
    this.HOST_URL = 'https://tv.nrk.no';
    this.HISTORY_API_URL = `${this.HOST_URL}/history`;

    this.loadHistory = this.loadHistory.bind(this);
    this.parseHistoryItem = this.parseHistoryItem.bind(this);
    this.loadTraktHistory = this.loadTraktHistory.bind(this);
    this.loadTraktItemHistory = this.loadTraktItemHistory.bind(this);
  }

  async loadHistory(nextPage:number , nextVisualPage:number, itemsToLoad:number) {
    try {
      let isLastPage = false;
      let items: Item[] = [];
      const historyItems:NrkHistoryItem[] = [];
      do {
        const responseText = await Requests.send({
          url: `${this.HISTORY_API_URL}?pg=${nextPage}`, //TODO figure out if pagination is even supported in the API
          method: 'GET',
        });
        const responseJson: NrkHistoryItem[] = JSON.parse(responseText);
        if (responseJson && responseJson.length > 0) {
          itemsToLoad -= responseJson.length;
          historyItems.push(...responseJson);
        } else {
          isLastPage = true;
        }
        nextPage += 1;
      } while (!isLastPage && itemsToLoad > 0);
      if (historyItems.length > 0) {
        items = historyItems.map(this.parseHistoryItem);
      }
      nextVisualPage += 1;
      NrkStore.update({isLastPage, nextPage, nextVisualPage, items})
          .then(this.loadTraktHistory);
    } catch (err) {
      Errors.error('Failed to load NRK history.', err);
      await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, {error: err});
    }
  }

  parseHistoryItem(historyItem: NrkHistoryItem): Item {
    const program: NrkProgramInfo = historyItem.program;
    let item: Item = null;
    const id = parseInt(program.id, 10);
    const type = program.programType === 'Episode' ? 'show' : 'movie';
    const year = program.productionYear || null;
    const percentageWatched = parseInt(historyItem.lastSeen.percentageWatched, 10);
    const watchedAt = moment(this.convertAspNetJSONDateToDateObject(historyItem.lastSeen.at));
    if (type === 'show') {
      const title = program.title.trim();
      const season = parseInt(program.seasonNumber, 10);
      const episode = parseInt(program.episodeNumber, 10);
      const episodeTitle = program.mainTitle.trim();
      item = new Item({id, type, title, year, season, episode, episodeTitle, isCollection: false, percentageWatched ,watchedAt});
    } else {
      const title = program.title.trim();
      item = new Item({id, type, title, year, percentageWatched, watchedAt});
    }
    return item;
  }

  async loadTraktHistory() {
    try {
      let promises = [];
      const items = NrkStore.data.items;
      promises = items.map(this.loadTraktItemHistory);
      await Promise.all(promises);
      NrkStore.update(null);
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

  convertAspNetJSONDateToDateObject(value: string): Date {
    const dateRegexp = /^\/?Date\((-?\d+)/i;
    if (dateRegexp.exec(value) !== null) {
      const dateInMs = parseInt(value.slice(6, 19), 10);
      const i = value.lastIndexOf('+');
      const offset = parseInt(value.substr(i + 1, 4), 10); // Get offset
      const offsetInMs = (offset / 100) * 60 * 60 * 1000;
      const dateWithOffset = dateInMs + offsetInMs;
      return new Date(dateWithOffset);
    }
    return new Date();
  }

}

const NrkApi = new _NrkApi();

export { NrkApi };
