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
  percentageWatched: number,
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
  watchedAt: GenericObject,
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
  itemsPerLoad: boolean,
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
};

declare type SyncOptions = {
  [key: string]: SyncOption,
};

declare type SyncOption = {
  id: keyof StorageValuesSyncOptions,
  name: string,
  value: boolean | number,
  type: string,
};

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
  body: string | Object,
};

declare type EventDispatcherListeners = {
  [key: number]: Function[],
};