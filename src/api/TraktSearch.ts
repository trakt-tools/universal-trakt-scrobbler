import { SyncItem } from '../models/SyncItem';
import { Events, EventDispatcher } from '../services/Events';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';
import { Item } from '../models/Item';

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

  async find(item: Item) {
    let syncItem: SyncItem = null;
    try {
      let searchItem: TraktSearchEpisodeItem|TraktSearchMovieItem = null;
      if (item.type === 'show') {
        searchItem = await this.findEpisode(item);
      } else {
        searchItem = await this.findItem(item) as TraktSearchMovieItem;
      }
      if (searchItem) {
        if (item.type === 'show') {
          const episodeItem = searchItem as TraktSearchEpisodeItem; //TODO can probably avoid assertion with clever generics
          const id = episodeItem.episode.ids.trakt;
          const title = episodeItem.show.title;
          const year = episodeItem.show.year;
          const season = episodeItem.episode.season;
          const episode = episodeItem.episode.number;
          const episodeTitle = episodeItem.episode.title;
          syncItem = new SyncItem({ id, type: item.type, title, year, season, episode, episodeTitle });
        } else {
          const movieItem = searchItem as TraktSearchMovieItem; //TODO can probably avoid assertion with clever generics
          const id = movieItem.movie.ids.trakt;
          const title = movieItem.movie.title;
          const year = movieItem.movie.year;
          syncItem = new SyncItem({ id, type: item.type, title, year });
        }
        await EventDispatcher.dispatch(Events.SEARCH_SUCCESS, { searchItem });
      } else {
        throw {
          request: { item },
          status: 404,
          text: 'Item not found.',
        };
      }
    } catch (err) {
      await EventDispatcher.dispatch(Events.SEARCH_ERROR, { error: err });
    }
    return syncItem;
  }

  async findItem(item: Item) {
    let searchItem = null;
    const responseText = await Requests.send({
      url: `${this.SEARCH_URL}/${item.type}?query=${encodeURIComponent(item.title)}`,
      method: 'GET',
    });
    const searchItems: (TraktSearchShowItem|TraktSearchMovieItem)[] = JSON.parse(responseText);
    if (item.type === 'show') {
      searchItem = searchItems[0] as TraktSearchShowItem; //TODO can probably avoid assigning with clever generics
    } else {
      // Get the exact match if there are multiple movies with the same name by checking the year.
      searchItem = (searchItems as TraktSearchMovieItem[]).find(x => x.movie.title === item.title && x.movie.year === item.year);
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

  async findEpisode(item: Item): Promise<TraktSearchEpisodeItem> {
    let episodeItem: TraktEpisodeItem = null;
    const showItem = await this.findItem(item) as TraktSearchShowItem;
    const responseText = await Requests.send({
      url: this.getEpisodeUrl(item, showItem.show.ids.trakt),
      method: 'GET',
    });
    if (item.episode) {
      episodeItem = {
        episode: JSON.parse(responseText),
      };
    } else {
      const episodeItems: TraktSearchEpisodeItem[] = JSON.parse(responseText);
      episodeItem = this.findEpisodeByTitle(item, showItem, episodeItems);
    }
    return Object.assign({}, episodeItem, showItem);
  }

  findEpisodeByTitle(item: Item, showItem: TraktSearchShowItem, episodeItems: TraktSearchEpisodeItem[]): TraktEpisodeItem {
    const episodeItem: TraktEpisodeItem = {
      episode: episodeItems.map(x => x.episode)//TODO figure out removed || x
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

  getEpisodeUrl(item: Item, traktId: number) {
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

  formatEpisodeTitle(title: string) {
    return title
      .toLowerCase()
      .replace(/(^|\s)(a|an|the)(\s)/g, '$1$3')
      .replace(/\s/g, '');
  }
}

const TraktSearch = new _TraktSearch();

export { TraktSearch };
