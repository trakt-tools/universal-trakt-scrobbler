class SyncItem implements ISyncItem {
	id: number;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	watchedAt?: import('moment').Moment;

	constructor(options: ISyncItem) {
		this.id = options.id;
		this.type = options.type;
		this.title = options.title;
		this.year = options.year;
		if (this.type === 'show') {
			this.season = options.season;
			this.episode = options.episode;
			this.episodeTitle = options.episodeTitle;
		}
		this.watchedAt = options.watchedAt;
	}
}

export { SyncItem };
