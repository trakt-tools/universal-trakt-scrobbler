import { Service } from '@models/Service';

export const PlayerPlService = new Service({
	id: 'player-pl',
	name: 'Player.pl',
	homePage: 'https://player.pl',
	hostPatterns: ['*://*.player.pl/*'],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
