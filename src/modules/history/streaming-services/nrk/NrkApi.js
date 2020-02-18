import moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { Events } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { NetflixStore } from '../netflix/NetflixStore';

class _NrkApi {
  constructor() {
    this.HOST_URL = 'https://tv.nrk.no';
    this.HISTORY_API_URL = `${this.HOST_URL}/history`;

    this.loadHistory = this.loadHistory.bind(this);
    this.parseHistoryItem = this.parseHistoryItem.bind(this);
    this.loadTraktHistory = this.loadTraktHistory.bind(this);
    this.loadTraktItemHistory = this.loadTraktItemHistory.bind(this);
  }

  /**
   * @param {number} nextPage
   * @param {number} nextVisualPage
   * @param {number} itemsToLoad
   * @returns {Promise}
   */
  async loadHistory(nextPage, nextVisualPage, itemsToLoad) {
    try {
      let isLastPage = false;
      /** @type {Array<Item>} */
      let items = [];
      /** @type {Array<NrkHistoryItem>} */
      const historyItems = [];
      do {
        const responseText = await Requests.send({
          url: `${this.HISTORY_API_URL}?pg=${nextPage}`, //TODO figure out if pagination is even supported in the API
          method: 'GET',
        });
        /** @type {NrkHistoryResponse} */
        const responseJson = JSON.parse(responseText);
        if (responseJson && responseJson.length > 0) {
          itemsToLoad -= responseJson.length;
          historyItems.push(...responseJson);
        } else {
          isLastPage = true;
        }
        nextPage += 1;
      } while (!isLastPage && itemsToLoad > 0);
      if (historyItems.length > 0) {
        items = historyItems.map(this.parseHistoryItem.bind(this));
      }
      nextVisualPage += 1;
      NetflixStore.update({isLastPage, nextPage, nextVisualPage, items})
          .then(this.loadTraktHistory.bind(this));
    } catch (err) {
      Errors.error('Failed to load NRK history.', err);
      await Events.dispatch(Events.NETFLIX_HISTORY_LOAD_ERROR, {error: err});
    }
  }

  /**
   * @param {NrkHistoryItem} historyItem
   * @returns {Item}
   */
  parseHistoryItem(historyItem) {
    /** @type {NrkProgramInfo} */
    const program = historyItem.program;
    /** @type {Item} */
    let item = null;
    const id = program.id;
    const type = program.programType === 'Episode' ? 'show' : 'movie';
    const year = program.productionYear || null;
    const watchedAt = moment(this.convertAspNetJSONDateToDateObject(historyItem.lastSeen.at));
    if (type === 'show') {
      const title = program.title.trim();
      const season = program.seasonNumber;
      const episode = program.episodeNumber;
      const episodeTitle = program.mainTitle.trim();
      item = new Item({id, type, title, year, season, episode, episodeTitle, isCollection: false, percentageWatched: historyItem.lastSeen.percentageWatched ,watchedAt});
    } else {
      const title = program.title.trim();
      item = new Item({id, type, title, year, percentageWatched: historyItem.lastSeen.percentageWatched, watchedAt});
    }
    return item;
  }

  /**
   * @returns {Promise}
   */
  async loadTraktHistory() {
    try {
      let promises = [];
      const items = NetflixStore.data.items;
      promises = items.map(this.loadTraktItemHistory.bind(this));
      await Promise.all(promises);
      NetflixStore.update(null);
    } catch (err) {
      Errors.error('Failed to load Trakt history.', err);
      await Events.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, {error: err});
    }
  }

  /**
   * @param {import('../../../../models/Item').Item} item
   * @returns {Promise}
   */
  async loadTraktItemHistory(item) {
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

  /**
   * @param {string} value
   * @returns {Date}
   */
  convertAspNetJSONDateToDateObject(value) {
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
