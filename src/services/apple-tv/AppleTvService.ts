import { Service } from '@models/Service';

export const AppleTvService = new Service({
	id: 'apple-tv',
	name: 'Apple TV',
	homePage: 'https://tv.apple.com/',
	hostPatterns: ['*://*.tv.apple.com/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
	limitations: ['Live sports, trailers, extras, and previews are not scrobbled.'],
});
