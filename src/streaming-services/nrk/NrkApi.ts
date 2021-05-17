import * as moment from 'moment';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { RequestException, Requests } from '../../common/Requests';
import { IItem, Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

export interface NrkGlobalObject {
	getPlaybackSession: () => NrkSession;
}

interface NrkUserData {
	name: string;
	profileType: string;
	userId: string;
}

interface NrkProgressResponse {
	progresses: NrkProgressItem[];
	_links: {
		backwards?: NrkLinkObject;
		next?: NrkLinkObject;
		self: NrkLinkObject;
	};
}

interface NrkLinkObject {
	href: string;
}

interface NrkProgressItemCommon {
	accessibilityValue: string;
	id: string;
	registeredAt: string;
	_embedded: {
		programs: NrkProgram;
	};
	_links: {
		deleteProgress: NrkLinkObject;
		programs: NrkLinkObject;
		self: NrkLinkObject;
	};
}

type NrkProgressItem = NrkProgressItemFinished | NrkProgressItemInProgress;

interface NrkProgressItemFinished extends NrkProgressItemCommon {
	finished: true;
	progress: 'finished';
}

interface NrkProgressItemInProgress extends NrkProgressItemCommon {
	progress: 'inProgress';
	registeredAt: string;
	inProgress: {
		percentage: number;
		time: string;
	};
}

interface NrkProgram {
	image: unknown;
	titles: {
		title: string;
		subtitle: string;
	};
	_links: {
		self: NrkLinkObject;
		share: NrkLinkObject;
	};
}

interface NrkProgramPage {
	moreInformation: {
		category: {
			id: string;
		};
		originalTitle: string;
		productionYear: number;
	};
	programInformation: {
		titles: {
			title: string;
		};
		image: NrkImage[];
	};
	_links: {
		seriesPage?: {
			href: string;
			name: string;
			title: string;
		};
		season: {
			name: string;
			title: string;
		};
	};
}

interface NrkImage {
	url: string;
	width: 300 | 600 | 960 | 1280 | 1600 | 1920;
}

export interface NrkSession {
	currentTime: number;
	duration: number;
	mediaItem: {
		id: string;
		title: string;
		subtitle: string;
	};
	playbackSessionId: string;
	// paused: boolean;
	playbackStarted: boolean;
	sequenceObserver: {
		isPaused: boolean;
	};
}

class _NrkApi extends Api {
	HOST_URL: string;
	API_HOST_URL: string;
	HISTORY_API_URL: string;
	TOKEN_URL: string;
	USERDATA_URL: string;
	PROGRAM_URL: string;
	token: string;
	isActivated: boolean;
	hasInjectedSessionScript: any;
	sessionListener: any;

	constructor() {
		super('nrk');

		this.HOST_URL = 'https://tv.nrk.no';
		this.API_HOST_URL = 'https://psapi.nrk.no';
		this.HISTORY_API_URL = '';
		this.TOKEN_URL = `${this.HOST_URL}/auth/token`;
		this.USERDATA_URL = `${this.HOST_URL}/auth/userdata`;
		this.PROGRAM_URL = '/tv/catalog/programs/';
		this.token = '';
		this.isActivated = false;
	}

	activate = async () => {
		const stringToken = await Requests.send({
			url: `${this.TOKEN_URL}?_=${Date.now()}`,
			method: 'GET',
		});
		this.token = stringToken.split('"').join('');
		const response = await Requests.send({
			url: this.USERDATA_URL,
			method: 'GET',
		});
		const userData = JSON.parse(response) as NrkUserData;
		this.HISTORY_API_URL = `${this.API_HOST_URL}/tv/userdata/${userData.userId}/progress?sortorder=descending&pageSize=10`;
		this.isActivated = true;
	};

	loadHistory = async (itemsToLoad: number, lastSync: number, lastSyncId: string) => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			const store = getSyncStore('nrk');
			let { hasReachedEnd, hasReachedLastSyncDate } = store.data;
			let items: Item[] = [];
			const historyItems: NrkProgressItem[] = [];
			do {
				const responseText = await Requests.send({
					url: this.HISTORY_API_URL,
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + this.token,
					},
				});
				const responseJson = JSON.parse(responseText) as NrkProgressResponse;
				const { progresses } = responseJson;
				if (responseJson._links.next) {
					this.HISTORY_API_URL = this.API_HOST_URL + responseJson._links.next.href;
				} else {
					hasReachedEnd = true;
				}
				if (progresses.length > 0) {
					let filteredItems = [];
					if (lastSync > 0) {
						for (const progress of progresses) {
							if (
								progress.registeredAt &&
								Math.trunc(new Date(progress.registeredAt).getTime() / 1e3) > lastSync
							) {
								filteredItems.push(progress);
							} else {
								hasReachedLastSyncDate = true;
								break;
							}
						}
						if (filteredItems.length !== progresses.length) {
							hasReachedEnd = true;
						}
					} else {
						filteredItems = progresses;
					}
					itemsToLoad -= filteredItems.length;
					historyItems.push(...filteredItems);
				}
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				const promises = historyItems.map(this.parseHistoryItem);
				items = await Promise.all(promises);
			}
			store.setData({ items, hasReachedEnd, hasReachedLastSyncDate });
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load NRK history.', err);
				await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
			throw err;
		}
	};

	parseHistoryItem = async (historyItem: NrkProgressItem): Promise<Item> => {
		const serviceId = this.id;
		const id = historyItem.id;
		const programInfo = historyItem._embedded.programs;
		const programPage = await this.lookupNrkItem(programInfo._links.self.href);
		const type = programPage._links.seriesPage !== undefined ? 'show' : 'movie';
		const titleInfo = programInfo.titles;
		//TODO This is a good point for having fallback-search items. Also this could be used to differenciate displaytitle and searchtitle.
		const title = this.getTitle(programPage);
		const watchedAt = historyItem.registeredAt ? moment(historyItem.registeredAt) : undefined;

		const baseItem: IItem = {
			type,
			id,
			serviceId,
			title,
			year: programPage.moreInformation.productionYear,
			percentageWatched:
				historyItem.progress === 'inProgress' ? historyItem.inProgress.percentage : 100,
			watchedAt,
		};

		if (type === 'show') {
			/* Known formats:
			 * S2 / 7. Episode Title
			 * S1 / 9. episode        (no title)
			 * 23.10.2020             (airdate is the only information)
			 */
			const regExp = /S([0-9]) [/] ([0-9]+)[.] (.+)/g; //This captures Season number, episode number, and episode title.
			const capturedEpisodeData = [...titleInfo.subtitle.matchAll(regExp)];
			let episodeTitle;
			let extraInfo;
			if (capturedEpisodeData.length) {
				const epInfo = capturedEpisodeData[0];
				episodeTitle = epInfo[3] === 'episode' ? epInfo[0] : epInfo[3]; //If title is not present, use the whole string.
				extraInfo = {
					season: Number.parseInt(epInfo[1]),
					episode: Number.parseInt(epInfo[2]),
				};
			} else {
				episodeTitle = titleInfo.subtitle;
			}
			return new Item({
				...baseItem,
				episodeTitle,
				...extraInfo,
			});
		} else {
			return new Item(baseItem);
		}
	};

	getTitle = (programPage: NrkProgramPage) => {
		const title =
			programPage._links?.seriesPage?.title || programPage.programInformation.titles.title;
		const { originalTitle } = programPage.moreInformation;
		if (originalTitle && !originalTitle.toLowerCase().includes(title.toLowerCase())) {
			//A few times the originalTitle could be a mix of title, season, episode number etc. But follows different patterns. Some Examples:
			//Mr. Robot, s. 4 - UNAUTHORIZED
			//BLINDPASSASJER 1:3.
			//Therese - jenta som forsvant - En kald sak
			//Chris Tarrant's Extreme Railways s. 6
			//Folkeopplysningen 6 - Kroppen på service
			return originalTitle;
		}
		return title;
	};

	lookupNrkItem = async (url: string) => {
		const response = await Requests.send({
			url: this.API_HOST_URL + url,
			method: 'GET',
		});
		return JSON.parse(response) as NrkProgramPage;
	};

	getSession = (): Promise<NrkSession | undefined | null> => {
		return new Promise((resolve) => {
			if ('wrappedJSObject' in window && window.wrappedJSObject) {
				// Firefox wraps page objects, so we can access the global netflix object by unwrapping it.
				let session: NrkSession | undefined | null;
				const { player } = window.wrappedJSObject;
				if (player && player.getPlaybackSession()) {
					const playbacksession = player.getPlaybackSession();
					session = {
						currentTime: playbacksession.currentTime,
						duration: playbacksession.duration,
						mediaItem: {
							id: playbacksession.mediaItem?.id,
							title: playbacksession.mediaItem?.title,
							subtitle: playbacksession.mediaItem?.subtitle,
						},
						playbackSessionId: playbacksession.playbackSessionId,
						playbackStarted: playbacksession.playbackStarted,
						sequenceObserver: { isPaused: playbacksession.sequenceObserver.isPaused },
					};
				}
				resolve(session);
			} else {
				// Chrome does not allow accessing page objects from extensions, so we need to inject a script into the page and exchange messages in order to access the global netflix object.
				if (!this.hasInjectedSessionScript) {
					const script = document.createElement('script');
					script.textContent = `
						window.addEventListener('uts-getSession', () => {
							let session;
							if (window.player && window.player.getPlaybackSession()) {
								const playbacksession = window.player.getPlaybackSession()
								session = {
									currentTime: playbacksession.currentTime,
									duration: playbacksession.duration,
									mediaItem: {
										id: playbacksession.mediaItem?.id,
										title: playbacksession.mediaItem?.title,
										subtitle: playbacksession.mediaItem?.subtitle,
									},
									playbackSessionId: playbacksession.playbackSessionId,
									playbackStarted: playbacksession.playbackStarted,
									sequenceObserver: { isPaused: playbacksession.sequenceObserver.isPaused },
								}
							}
							const event = new CustomEvent('uts-onSessionReceived', {
								detail: { session: JSON.stringify(session) },
							});
							window.dispatchEvent(event);
						});
					`;
					document.body.appendChild(script);
					this.hasInjectedSessionScript = true;
				}
				if (this.sessionListener) {
					window.removeEventListener('uts-onSessionReceived', this.sessionListener);
				}
				this.sessionListener = (event: Event) => {
					const session = (event as CustomEvent<Record<'session', string | undefined>>).detail
						.session;
					if (typeof session === 'undefined') {
						resolve(session);
					} else {
						resolve(JSON.parse(session) as NrkSession | null);
					}
				};
				window.addEventListener('uts-onSessionReceived', this.sessionListener, false);
				const event = new CustomEvent('uts-getSession');
				window.dispatchEvent(event);
			}
		});
	};

	getItem = async (id: string): Promise<Item | undefined> => {
		const programPage = await this.lookupNrkItem(this.PROGRAM_URL + id);
		const title = this.getTitle(programPage);
		const type = programPage._links.seriesPage !== undefined ? 'show' : 'movie';
		const baseItem: IItem = {
			id,
			serviceId: this.id,
			type,
			title,
			year: programPage.moreInformation.productionYear,
		};
		if (type === 'show') {
			const { title } = programPage.programInformation.titles;
			const capturedEpisodeData = [...title.matchAll(/([0-9]+)[.] (.+)/g)];
			let episodeTitle;
			let extraInfo;
			if (capturedEpisodeData.length) {
				const epInfo = capturedEpisodeData[0];
				episodeTitle = epInfo[2] === 'episode' ? epInfo[0] : epInfo[2]; //If title is not present, use the whole string.
				extraInfo = {
					season: Number.parseInt(programPage._links.season.name),
					episode: Number.parseInt(epInfo[1]),
				};
			} else {
				episodeTitle = title;
			}
			return new Item({
				...baseItem,
				episodeTitle,
				...extraInfo,
			});
		} else {
			return new Item(baseItem);
		}
	};
}

export const NrkApi = new _NrkApi();

registerApi('nrk', NrkApi);
