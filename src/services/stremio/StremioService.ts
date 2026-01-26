import { Service } from '@models/Service';

export const StremioService = new Service({
	id: 'stremio',
	name: 'stremio',
	homePage: 'https://app.strem.io',
	hostPatterns: ['*://*.app.strem.io/*', '*://stremio.zarg.me/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
