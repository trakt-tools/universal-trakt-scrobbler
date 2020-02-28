class SyncItem {
  constructor(options) {
    this.id = options.id;
    this.type = options.type;
    this.title = options.title;
    this.year = options.year;
    if (this.type === 'show') {
      this.season = options.season;
      this.episode = options.episode;
      this.episodeTitle = options.episodeTitle;
    }
    this.watchedAt = options.watchedAt || null;
  }
}

export { SyncItem };