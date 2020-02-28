import { SyncItem } from '../models/SyncItem';
import { Events } from '../services/Events';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';

class _TraktSearch extends TraktApi {
  constructor() {
    super();

    this.find = this.find.bind(this);
    this.findItem = this.findItem.bind(this);
    this.findEpisode = this.findEpisode.bind(this);
    this.findEpisodeByTitle = this.findEpisodeByTitle.bind(this);
    this.getEpisodeUrl = this.getEpisodeUrl.bind(this);
    this.formatEpisodeTitle = this.formatEpisodeTitle.bind(this);
  }

  /**
   * @param {import('../models/Item').Item} item
   * @returns {Promise<SyncItem>}
   */
  async find(item) {
    /** @type {SyncItem} */
    let syncItem = null;
    try {
      /** @type {TraktSearchEpisodeItem|TraktSearchMovieItem} */
      let searchItem = null;
      if (item.type === 'show') {
        searchItem = await this.findEpisode(item);
      } else {
        searchItem = await this.findItem(item);
      }
      if (searchItem) {
        if (item.type === 'show') {
          /** @type {TraktSearchEpisodeItem} */
          const episodeItem = searchItem;
          const id = episodeItem.episode.ids.trakt;
          const title = episodeItem.show.title;
          const year = episodeItem.show.year;
          const season = episodeItem.episode.season;
          const episode = episodeItem.episode.number;
          const episodeTitle = episodeItem.episode.title;
          syncItem = new SyncItem({ id, type: item.type, title, year, season, episode, episodeTitle });
        } else {
          /** @type {TraktSearchMovieItem} */
          const movieItem = searchItem;
          const id = movieItem.movie.ids.trakt;
          const title = movieItem.movie.title;
          const year = movieItem.movie.year;
          syncItem = new SyncItem({ id, type: item.type, title, year });
        }
        await Events.dispatch(Events.SEARCH_SUCCESS, { searchItem });
      } else {
        throw {
          request: { item },
          status: 404,
          text: 'Item not found.',
        };
      }
    } catch (err) {
      await Events.dispatch(Events.SEARCH_ERROR, { error: err });
    }
    return syncItem;
  }

  /**
   * @param {import('../models/Item').Item} item
   * @returns {Promise<TraktSearchShowItem|TraktSearchMovieItem>}
   */
  async findItem(item) {
    /** @type {TraktSearchShowItem|TraktSearchMovieItem} */
    let searchItem = null;
    const responseText = await Requests.send({
      url: `${this.SEARCH_URL}/${item.type}?query=${encodeURIComponent(item.title)}`,
      method: 'GET',
    });
    /** @type {Array<TraktSearchShowItem|TraktSearchMovieItem>} */
    const searchItems = JSON.parse(responseText);
    if (item.type === 'show') {
      searchItem = searchItems[0];
    } else {
      // Get the exact match if there are multiple movies with the same name by checking the year.
      searchItem = searchItems.find(x => x.movie.title === item.title && x.movie.year === item.year);
    }
    if (!searchItem) {
      throw {
        request: { item },
        status: 404,
        text: responseText,
      };
    }
    return searchItem;
  }

  /**
   * @param {import('../models/Item').Item} item
   * @returns {Promise<TraktSearchEpisodeItem>}
   */
  async findEpisode(item) {
    /** @type {TraktSearchEpisodeItem} */
    let episodeItem = null;
    /** @type {TraktSearchShowItem} */
    const showItem = await this.findItem(item);
    const responseText = await Requests.send({
      url: this.getEpisodeUrl(item, showItem.show.ids.trakt),
      method: 'GET',
    });
    if (item.episode) {
      episodeItem = {
        episode: JSON.parse(responseText),
      };
    } else {
      /** @type {Array<TraktSearchEpisodeItem>} */
      const episodeItems = JSON.parse(responseText);
      episodeItem = this.findEpisodeByTitle(item, showItem, episodeItems);
    }
    Object.assign(episodeItem, showItem);
    return episodeItem;
  }

  /**
   * @param {import('../models/Item').Item} item
   * @param {TraktSearchShowItem} showItem
   * @param {Array<TraktSearchEpisodeItem>} episodeItems
   * @returns {TraktSearchEpisodeItem}
   */
  findEpisodeByTitle(item, showItem, episodeItems) {
    /** @type TraktSearchEpisodeItem */
    const episodeItem = {
      episode: episodeItems.map(x => x.episode || x)
        .find(x => x.title && item.episodeTitle && this.formatEpisodeTitle(x.title) === this.formatEpisodeTitle(item.episodeTitle)),
    };
    if (!episodeItem) {
      throw {
        request: { item, showItem },
        status: 404,
        text: 'Episode not found.',
      };
    }
    return episodeItem;
  }

  /**
   * @param {import('../models/Item').Item} item
   * @param {string} traktId
   * @returns {string}
   */
  getEpisodeUrl(item, traktId) {
    let url = '';
    if (item.episode) {
      url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}/episodes/${item.episode}`;
    } else if (item.isCollection) {
      url = `${this.SEARCH_URL}/episode?query=${encodeURIComponent(item.episodeTitle)}`;
    } else {
      url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}`;
    }
    return url;
  }

  /**
   * @param {string} title
   * @returns {string}
   */
  formatEpisodeTitle(title) {
    return title
      .toLowerCase()
      .replace(/(^|\s)(a|an|the)(\s)/g, '$1$3')
      .replace(/\s/g, '');
  }
}

const TraktSearch = new _TraktSearch();

export { TraktSearch };