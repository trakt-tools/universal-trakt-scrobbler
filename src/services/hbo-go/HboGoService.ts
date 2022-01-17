import { Service } from '@models/Service';

export const HboGoService = new Service({
	id: 'hbo-go',
	name: 'HBO Go',
	homePage: 'https://hbogo.eu',
	hostPatterns: [
		'*://*.hbogo.co.th/*',
		'*://*.hbogoasia.com/*',
		'*://*.hbogo.hu/*',
		'*://*.hbogo.cz/*',
		'*://*.hbogo.sk/*',
		'*://*.hbogo.ro/*',
		'*://*.hbogo.ru/*',
		'*://*.hbogo.pl/*',
		'*://*.hbogo.hr/*',
		'*://*.hbogo.rs/*',
		'*://*.hbogo.si/*',
		'*://*.hbogo.mk/*',
		'*://*.hbogo.me/*',
		'*://*.hbogo.bg/*',
		'*://*.hbogo.ba/*',
		'*://*.hbogo.eu/*',
	],
	hasScrobbler: true,
	hasSync: false,
	hasAutoSync: false,
});
