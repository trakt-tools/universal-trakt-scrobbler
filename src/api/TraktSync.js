import moment from 'moment';
import { Errors } from '../services/Errors';
import { Events } from '../services/Events';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';

class _TraktSync extends TraktApi {
  constructor() {
    super();

    this.loadHistory = this.loadHistory.bind(this);
    this.getUrl = this.getUrl.bind(this);
    this.sync = this.sync.bind(this);
  }

  /**
   * @param {import('../models/Item').Item} item
   * @returns {Promise}
   */
  async loadHistory(item) {
    const responseText = await Requests.send({
      url: this.getUrl(item),
      method: 'GET',
    });
    /** @type {TraktHistoryItems} */
    const historyItems = JSON.parse(responseText);
    const historyItem = historyItems.find(x => moment(x.watched_at).diff(item.watchedAt, 'days') === 0);
    item.trakt.watchedAt = historyItem ? moment(historyItem.watched_at) : null;
  }

  /**
   * @param {import('../models/Item').Item} item
   * @returns {string}
   */
  getUrl(item) {
    let url = '';
    if (item.type === 'show') {
      url = `${this.SYNC_URL}/episodes/${item.trakt.id}`;
    } else {
      url = `${this.SYNC_URL}/movies/${item.trakt.id}`;
    }
    return url;
  }

  /**
   * @param {Array<import('../models/Item').Item>} items
   * @param {boolean} addWithReleaseDate
   * @returns {Promise}
   */
  async sync(items, addWithReleaseDate) {
    try {
      const data = {
        episodes: items.filter(item => item.isSelected && item.type === 'show')
          .map(item => ({
            ids: { trakt: item.trakt.id },
            watched_at: addWithReleaseDate ? 'released' : item.watchedAt,
          })),
        movies: items.filter(item => item.isSelected && item.type === 'movie')
          .map(item => ({
            ids: { trakt: item.trakt.id },
            watched_at: addWithReleaseDate ? 'released' : item.watchedAt,
          })),
      };
      const responseText = await Requests.send({
        url: this.SYNC_URL,
        method: 'POST',
        body: data,
      });
      /** @type {TraktSyncResponse} */
      const responseJson = JSON.parse(responseText);
      const notFoundItems = {
        episodes: responseJson.not_found.episodes.map(item => item.ids.trakt),
        movies: responseJson.not_found.movies.map(item => item.ids.trakt),
      }
      for (const item of items) {
        if (item.isSelected) {
          if (item.type === 'show' && !notFoundItems.episodes.includes(item.trakt.id)) {
            item.trakt.watchedAt = item.watchedAt;
          } else if (item.type === 'movie' && !notFoundItems.movies.includes(item.trakt.id)) {
            item.trakt.watchedAt = item.watchedAt;
          }
        }
      }
      await Events.dispatch(Events.HISTORY_SYNC_SUCCESS, { added: responseJson.added });
    } catch (err) {
      Errors.error('Failed to sync history.', err);
      await Events.dispatch(Events.HISTORY_SYNC_ERROR, { error: err });
    }
  }
}

const TraktSync = new _TraktSync();

export { TraktSync };