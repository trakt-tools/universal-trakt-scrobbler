import { Service } from '@models/Service';

export const PolsatboxgoPlService = new Service({
	id: 'polsatboxgo-pl',
	name: 'Polsatboxgo.pl',
	homePage: 'https://polsatboxgo.pl',
	hostPatterns: ['*://*.polsatboxgo.pl/*', '*://*.polsatgo.pl/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
