declare type GenericObject = {
  [key: string]: any,
};

declare type TraktManualAuth = {
  callback: Function,
  tabId: number,
};

declare interface IItem {
  id: number,
  type: 'show' | 'movie',
  title: string,
  year: number,
  season?: number,
  episode?: number,
  episodeTitle?: string,
  isCollection?: boolean,
  watchedAt: GenericObject,
  percentageWatched?: number,
  trakt?: ISyncItem | TraktNotFound,
}

declare interface ISyncItem {
  id: number,
  type: 'show' | 'movie',
  title: string,
  year: number,
  season?: number,
  episode?: number,
  episodeTitle?: string,
  watchedAt?: GenericObject,
}

declare type TraktNotFound = {
  notFound: true,
};

declare type StorageValues = {
  auth?: TraktAuthDetails,
  options?: StorageValuesOptions,
  syncOptions?: StorageValuesSyncOptions,
  traktCache?: {
    [key: string]: string,
  },
};

declare type TraktAuthDetails = {
  access_token: string,
  token_type: string,
  expires_in: number,
  refresh_token: string,
  scope: string,
  created_at: number,
};

declare type StorageValuesOptions = {
  allowRollbar: boolean,
  sendReceiveSuggestions: boolean,
};

declare type StorageValuesSyncOptions = {
  addWithReleaseDate: boolean,
  hideSynced: boolean,
  itemsPerLoad: number,
  use24Clock: boolean,
};

declare type Options = {
  [key: string]: Option,
};

declare type Option = {
  id: keyof StorageValuesOptions,
  name: string,
  description: string,
  value: boolean,
  origins: string[],
  permissions: browser.permissions.Permission[];
};

declare type SyncOptions = { [K in keyof StorageValuesSyncOptions]: { id: K, value: StorageValuesSyncOptions[K], name: string } };
declare type SyncOption = SyncOptions[keyof SyncOptions]

declare type ErrorEventData = {
  error: ErrorDetails | RequestException,
};

declare type ErrorDetails = {
  message?: string,
};

declare type RequestException = {
  request: RequestDetails,
  status: number,
  text: string,
};

declare type RequestDetails = {
  url: string,
  method: string,
  body?: string | Object,
};

declare type EventDispatcherListeners = {
  [key: number]: Function[],
};


declare interface TraktHistoryItem {
  watched_at: string;
}

declare interface OptionEventData {
  id: string;
  checked: boolean;
}

type TraktSearchEpisodeItem = TraktEpisodeItem & TraktSearchShowItem;

declare interface TraktEpisodeItem {
  episode: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt: number;
    }
  }
}

declare interface TraktSearchShowItem {
  show: {
    title: string;
    year: number;
    ids: {
      trakt: number;
    }
  }
}

declare interface TraktSearchMovieItem {
  movie: {
    title: string;
    year: number;
    ids: {
      trakt: number;
    }
  }
}

declare interface NrkHistoryItem {
  lastSeen: NrkLastSeen;
  program: NrkProgramInfo;
}

declare interface NrkLastSeen {
  at: string;
  percentageWatched: string;
  percentageAssumedFinished: string;
}

declare interface NrkProgramInfo {
  id: string
  title: string
  mainTitle: string
  viewCount: number
  description: string
  programType: 'Program' | 'Episode'
  seriesId: string
  episodeNumber: string
  totalEpisodesInSeason: string
  episodeNumberOrDate: string
  seasonNumber: string
  productionYear: number
}

declare interface NetflixHistoryResponse {
  viewedItems: NetflixHistoryItem[];
}

declare type NetflixHistoryItem = NetflixHistoryShowItem|NetflixHistoryMovieItem;

declare interface NetflixHistoryShowItem {
  date: number
  duration: number
  episodeTitle: string
  movieID: number
  seasonDescriptor: string
  series: number
  seriesTitle: string
  title: string
}

declare interface NetflixHistoryMovieItem {
  date: number;
  duration: number;
  movieID: number;
  title: string;
}

declare interface NetflixMetadataResponse {
  value: {
    videos: {[key: number]: NetflixMetadataItem}; //TODO verify {Object<string, NetflixMetadataItem>} value.videos
  }
}

declare type NetflixMetadataItem = NetflixMetadataShowItem|NetflixMetadataMovieItem;

declare interface NetflixMetadataShowItem {
  releaseYear: number;
  summary: {
    episode: number;
    id: number;
    season: number;
  }
}

declare interface NetflixMetadataMovieItem {
  releaseYear: number;
  summary: {
    id: number;
  }
}

declare type NetflixHistoryItemWithMetadata = NetflixHistoryShowItemWithMetadata|NetflixHistoryMovieItemWithMetadata;

declare type NetflixHistoryShowItemWithMetadata = NetflixHistoryShowItem & NetflixMetadataShowItem;

declare type NetflixHistoryMovieItemWithMetadata = NetflixHistoryMovieItem & NetflixMetadataMovieItem;

declare interface TV2SumoHistoryItem {
  id: number;
  date: number;
  asset: TV2SumoInfo;
  season: TV2SumoInfo;
  show: TV2SumoInfo;
}

declare interface TV2SumoInfo {
  id: number;
  title: string;
  path: string;
}

declare type TV2SumoMetadataResponse = TV2SumoMetadataResponseEpisode|TV2SumoMetadataResponseMovie;

declare interface TV2SumoMetadataResponseEpisode {
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

declare interface TV2SumoMetadataResponseMovie {
  id: number;
  title: string;
  asset_type: "movie";
}

declare type TV2SumoHistoryItemWithMetadata = TV2SumoMetadataResponse & {
  date: number;
}

interface TraktSyncResponse {
  added: {
    episodes: number;
    movies: number;
  }
  not_found: {
    episodes: TraktSyncNotFound[];
    movies: TraktSyncNotFound[];
  }
}

interface TraktSyncNotFound {
  ids: {
    trakt: number;
  }
}
