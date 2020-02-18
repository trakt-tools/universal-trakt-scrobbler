
import moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { Events } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { NetflixStore } from './NetflixStore';

class _NetflixApi {
  constructor() {
    this.HOST_URL = 'https://www.netflix.com';
    this.API_URL = `${this.HOST_URL}/api/shakti`;
    this.ACTIVATE_URL = `${this.HOST_URL}/Activate`;
    this.AUTH_REGEX = /"authURL":"(.*?)"/;
    this.BUILD_IDENTIFIER_REGEX = /"BUILD_IDENTIFIER":"(.*?)"/;

    /** @type {boolean} */
    this.isActivated = false;

    /** @type {string} */
    this.authUrl = '';

    /** @type {string} */
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

  /**
   * @param {string} text
   * @returns {string}
   */
  extractAuthUrl(text) {
    return text.match(this.AUTH_REGEX)[1];
  }

  /**
   * @param {string} text
   * @returns {string}
   */
  extractBuildIdentifier(text) {
    return text.match(this.BUILD_IDENTIFIER_REGEX)[1];
  }

  /**
   * @returns {Promise}
   */
  async activate() {
    const responseText = await Requests.send({
      url: this.ACTIVATE_URL,
      method: 'GET',
    });
    this.authUrl = this.extractAuthUrl(responseText);
    this.buildIdentifier = this.extractBuildIdentifier(responseText);
    this.isActivated = true;
  }

  /**
   * @param {number} nextPage
   * @param {number} nextVisualPage
   * @param {number} itemsToLoad
   * @returns {Promise}
   */
  async loadHistory(nextPage, nextVisualPage, itemsToLoad) {
    try {
      if (!this.isActivated) {
        await this.activate();
      }
      let isLastPage = false;
      /** @type {Array<Item>} */
      let items = [];
      /** @type {NetflixHistoryItems} */
      const historyItems = [];
      do {
        const responseText = await Requests.send({
          url: `${this.API_URL}/${this.buildIdentifier}/viewingactivity?languages=en-US&authURL=${this.authUrl}&pg=${nextPage}`,
          method: 'GET',
        });
        /** @type {NetflixHistoryResponse} */
        const responseJson = JSON.parse(responseText);
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
      NetflixStore.update({ isLastPage, nextPage, nextVisualPage, items })
        .then(this.loadTraktHistory);
    } catch (err) {
      Errors.error('Failed to load Netflix history.', err);
      await Events.dispatch(Events.NETFLIX_HISTORY_LOAD_ERROR, { error: err });
    }
  }

  /**
   * @param {NetflixHistoryItems} historyItems
   * @returns {Promise<NetflixHistoryItemsWithMetadata>}
   */
  async getHistoryMetadata(historyItems) {
    /** @type {NetflixHistoryItemsWithMetadata} */
    let historyItemsWithMetadata = [];
    const responseText = await Requests.send({
      url: `${this.API_URL}/${this.buildIdentifier}/pathEvaluator?languages=en-US`,
      method: 'POST',
      body: `authURL=${this.authUrl}&${historyItems.map(historyItem => `path=["videos",${historyItem.movieID},["releaseYear","summary"]]`).join('&')}`,
    });
    /** @type {NetflixMetadataResponse} */
    const responseJson = JSON.parse(responseText);
    if (responseJson && responseJson.value.videos) {
      historyItemsWithMetadata = historyItems.map(historyItem => {
        const metadata = responseJson.value.videos[historyItem.movieID];
        if (metadata) {
          Object.assign(historyItem, metadata);
        }
        return historyItem;
      });
    } else {
      throw responseText;
    }
    return historyItemsWithMetadata;
  }

  /**
   * @param {NetflixHistoryItemWithMetadata} historyItem
   * @returns {Item}
   */
  parseHistoryItem(historyItem) {
    /** @type {Item} */
    let item = null;
    const id = historyItem.movieID;
    const type = typeof historyItem.series !== 'undefined' ? 'show' : 'movie';
    const year = historyItem.releaseYear || null;
    const watchedAt = moment(historyItem.date);
    if (type === 'show') {
      const title = historyItem.seriesTitle.trim();
      let season = null;
      let episode = null;
      const isCollection = !historyItem.seasonDescriptor.includes('Season');
      if (!isCollection) {
        season = historyItem.summary.season;
        episode = historyItem.summary.episode;
      }
      const episodeTitle = historyItem.episodeTitle.trim();
      item = new Item({ id, type, title, year, season, episode, episodeTitle, isCollection, watchedAt });
    } else {
      const title = historyItem.title.trim();
      item = new Item({ id, type, title, year, watchedAt });
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
      promises = items.map(this.loadTraktItemHistory);
      await Promise.all(promises);
      await NetflixStore.update(null);
    } catch (err) {
      Errors.error('Failed to load Trakt history.', err);
      await Events.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, { error: err });
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
}

const NetflixApi = new _NetflixApi();

export { NetflixApi };
