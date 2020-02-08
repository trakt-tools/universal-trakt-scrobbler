// We use this to correct known wrong titles.
const correctTitles = {
  ['Dynasty']: 'Dynasty reboot',
  ['Shameless (U.S.)']: 'Shameless',
  ['Star Wars: The Clone Wars']: '"Star Wars: The Clone Wars"',
  ['The 100']: '"The 100"',
  ['The Avengers']: '"The Avengers"',
  ['The Blind Side']: '"The Blind Side"',
  ['The House of Cards Trilogy (BBC)']: 'The House of Cards',
  ['The Office (U.S.)']: 'The Office (US)',
  ['The Seven Deadly Sins']: '"The Seven Deadly Sins"',
  ['Young and Hungry']: '"Young and Hungry"',
};

/** @type {ItemInterface} */
class Item {
  constructor(options) {
    this.id = options.id;
    this.type = options.type;
    this.title = correctTitles[options.title] || options.title;
    this.year = options.year;
    if (this.type === 'show') {
      this.season = options.season;
      this.episode = options.episode;
      this.episodeTitle = options.episodeTitle;
      this.isCollection = options.isCollection;
    }
    this.watchedAt = options.watchedAt;
    this.trakt = options.trakt || null;
  }
}

export { Item };