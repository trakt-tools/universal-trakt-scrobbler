/**
 * @typedef {Object} ErrorEventData
 * @property {RequestException} error
 */

/**
 * @typedef {Object} LoginEventData
 * @property {TraktAuthDetails} auth
 */

/**
 * @typedef {Object} OptionEventData
 * @property {string} id
 * @property {boolean} checked
 */

/**
 * @typedef {Object} RequestDetails
 * @property {string} url
 * @property {string} method
 * @property {string|Object<string, any>} body
 */

/**
 * @typedef {Object} RequestException
 * @property {RequestDetails} request
 * @property {number} status
 * @property {string} text
 */

/**
 * @typedef {Object} SearchEventData
 * @property {TraktSearchData} data
 */

/**
 * @typedef {Object} ScrobbleEventData
 * @property {import('./models/ScrobbleItem').ScrobbleItem} item
 * @property {number} scrobbleType
 * @property {RequestException} error
 */

/**
 * @typedef {Object} ScrobbleProgressEventData
 * @property {number} progress
 */

/**
 * @typedef {Object} StorageValues
 * @property {TraktAuthDetails} auth
 * @property {TraktSearchData} currentItem
 * @property {Object} options
 * @property {boolean} options.allowRollbar
 * @property {boolean} options.showNotifications
 * @property {boolean} options.sendReceiveCorrections
 * @property {boolean} options.grantCookies
 * @property {Object} traktCache
 */

/**
 * @typedef {Object} TraktAuthDetails
 * @property {string} access_token
 * @property {string} token_type
 * @property {number} expires_in
 * @property {string} refresh_token
 * @property {string} scope
 * @property {number} created_at
 */


/**
 * @typedef {Object} TraktManualAuth
 * @property {Function} callback
 * @property {number} tabId
 */

/**
 * @typedef {Array<TraktSearchItem>} TraktSearchItems
 */

/**
 * @typedef {TraktSearchEpisodeItem|TraktSearchShowItem|TraktSearchMovieItem} TraktSearchItem
 */

/**
 * @typedef {Object} TraktSearchEpisodeItem
 * @property {Object} episode
 * @property {number} episode.season
 * @property {number} episode.number
 * @property {string} episode.title
 * @property {Object} episode.ids
 * @property {number} episode.ids.trakt
 * @property {Object} show
 * @property {string} show.title
 * @property {number} show.year
 * @property {Object} show.ids
 * @property {number} show.ids.trakt
 */

/**
 * @typedef {Object} TraktSearchShowItem
 * @property {Object} show
 * @property {string} show.title
 * @property {number} show.year
 * @property {Object} show.ids
 * @property {number} show.ids.trakt
 */

/**
 * @typedef {Object} TraktSearchMovieItem
 * @property {Object} movie
 * @property {string} movie.title
 * @property {number} movie.year
 * @property {Object} movie.ids
 * @property {number} movie.ids.trakt
 */


/**
 * @typedef {Array<NrkHistoryItem>} NrkHistoryResponse
 */

/**
 * @typedef {Object} NrkHistoryItem
 * @property {NrkLastSeen} lastSeen
 * @property {NrkProgramInfo} program
 */

/**
 * @typedef {Object} NrkLastSeen
 * @property {string} at
 * @property {number} percentageWatched
 * @property {number} percentageAssumedFinished
 */

/**
 * @typedef {Object} NrkProgramInfo
 * @property {string} id
 * @property {string} title
 * @property {string} mainTitle
 * @property {number} viewCount
 * @property {string} description
 * @property {'Program'|'Episode'} programType
 * @property {string} seriesId
 * @property {string} episodeNumber
 * @property {string} totalEpisodesInSeason
 * @property {string} episodeNumberOrDate
 * @property {string} seasonNumber
 * @property {number} productionYear
 */

/**
 * @typedef {Object} NetflixHistoryResponse
 * @property {NetflixHistoryItems} viewedItems
 */

/**
 * @typedef {Array<NetflixHistoryItem>} NetflixHistoryItems
 */

/**
 * @typedef {NetflixHistoryShowItem|NetflixHistoryMovieItem} NetflixHistoryItem
 */

/**
 * @typedef {Object} NetflixHistoryShowItem
 * @property {number} date
 * @property {number} duration
 * @property {string} episodeTitle
 * @property {number} movieID
 * @property {string} seasonDescriptor
 * @property {number} series
 * @property {string} seriesTitle
 * @property {string} title
 */

/**
 * @typedef {Object} NetflixHistoryMovieItem
 * @property {number} date
 * @property {number} duration
 * @property {number} movieID
 * @property {string} title
 */

/**
 * @typedef {Object} NetflixMetadataResponse
 * @property {Object} value
 * @property {Object<string, NetflixMetadataItem>} value.videos
 */

/**
 * @typedef {NetflixMetadataShowItem|NetflixMetadataMovieItem} NetflixMetadataItem
 */

/**
 * @typedef {Object} NetflixMetadataShowItem
 * @property {number} releaseYear
 * @property {Object} summary
 * @property {number} summary.episode
 * @property {number} summary.id
 * @property {number} summary.season
 */

/**
 * @typedef {Object} NetflixMetadataMovieItem
 * @property {number} releaseYear
 * @property {Object} summary
 * @property {number} summary.id
 */

/**
 * @typedef {Array<NetflixHistoryItemWithMetadata>} NetflixHistoryItemsWithMetadata
 */

/**
 * @typedef {NetflixHistoryShowItemWithMetadata|NetflixHistoryMovieItemWithMetadata} NetflixHistoryItemWithMetadata
 */

/**
 * @typedef {NetflixHistoryShowItem & NetflixMetadataShowItem} NetflixHistoryShowItemWithMetadata
 */

/**
 * @typedef {NetflixHistoryMovieItem & NetflixMetadataMovieItem} NetflixHistoryMovieItemWithMetadata
 */

/**
 * @typedef {Object} NetflixStoreData
 * @property {boolean} isLastPage
 * @property {number} nextPage
 * @property {number} nextVisualPage
 * @property {Array<import('./models/Item').Item>} items
 */

/**
 * @typedef {Object} ItemInterface
 * @property {number} id
 * @property {'show'|'movie'} type
 * @property {string} title
 * @property {number} year
 * @property {number} [season]
 * @property {number} [episode]
 * @property {string} [episodeTitle]
 * @property {boolean} [isCollection]
 * @property {import('moment')} watchedAt
 * @property {number} percentageWatched
 * @property {import('./models/SyncItem').SyncItem|TraktNotFound} [trakt]
 */

/**
 * @typedef {Object} SyncItemInterface
 * @property {number} id
 * @property {'show'|'movie'} type
 * @property {string} title
 * @property {number} year
 * @property {number} [season]
 * @property {number} [episode]
 * @property {string} [episodeTitle]
 * @property {import('moment')} watchedAt
 */

/**
 * @typedef {Object} TraktNotFound
 * @property {true} notFound
 */

/**
 * @typedef {Array<TraktHistoryItem>} TraktHistoryItems
 */

/**
 * @typedef {Object} TraktHistoryItem
 * @property {string} watched_at
 */

/**
 * @typedef {Object} TraktSyncResponse
 * @property {Object} added
 * @property {number} added.episodes
 * @property {number} added.movies
 * @property {Object} not_found
 * @property {Array<TraktSyncNotFound>} not_found.episodes
 * @property {Array<TraktSyncNotFound>} not_found.movies
 */

/**
 * @typedef {Object} TraktSyncNotFound
 * @property {Object} ids
 * @property {number} ids.trakt
 */
