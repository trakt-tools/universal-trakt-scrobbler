import { TraktApi } from '@apis/TraktApi';
import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';

export interface TraktScrobbleData {
	movie?: {
		ids: {
			trakt: number;
		};
	};
	episode?: {
		ids: {
			trakt: number;
		};
	};
	progress: number;
}

class _TraktScrobble extends TraktApi {
	START: number;
	PAUSE: number;
	STOP: number;

	paths: Record<number, string>;

	constructor() {
		super();

		this.START = 1;
		this.PAUSE = 2;
		this.STOP = 3;

		this.paths = {
			[this.START]: '/start',
			[this.PAUSE]: '/pause',
			[this.STOP]: '/stop',
		};
	}

	async start(item: Item): Promise<void> {
		if (!item.trakt) {
			return;
		}
		await this.send(item.trakt, this.START);
		let { scrobblingDetails } = await BrowserStorage.get('scrobblingDetails');
		if (scrobblingDetails) {
			scrobblingDetails.isPaused = false;
		} else {
			scrobblingDetails = {
				item: Item.save(item),
				tabId: Shared.tabId,
				isPaused: false,
			};
		}
		await BrowserStorage.set({ scrobblingDetails }, false);
		await EventDispatcher.dispatch('SCROBBLE_START', null, scrobblingDetails);
	}

	async pause(item: Item): Promise<void> {
		if (!item.trakt) {
			return;
		}
		await this.send(item.trakt, this.PAUSE);
		const { scrobblingDetails } = await BrowserStorage.get('scrobblingDetails');
		if (scrobblingDetails) {
			scrobblingDetails.isPaused = true;
			await BrowserStorage.set({ scrobblingDetails }, false);
			await EventDispatcher.dispatch('SCROBBLE_PAUSE', null, scrobblingDetails);
		}
	}

	async stop(item?: Item): Promise<void> {
		const { scrobblingDetails } = await BrowserStorage.get('scrobblingDetails');
		if (!scrobblingDetails) {
			return;
		}
		if (!item) {
			item = Item.load(scrobblingDetails.item);
		}
		if (!item) {
			return;
		}
		if (item.trakt) {
			await this.send(item.trakt, this.STOP);
		}
		await BrowserStorage.remove('scrobblingDetails', false);
		await EventDispatcher.dispatch('SCROBBLE_STOP', null, scrobblingDetails);
	}

	async send(item: TraktItem, scrobbleType: number): Promise<void> {
		const path = this.paths[scrobbleType];
		try {
			const data = {} as TraktScrobbleData;
			if (item.type === 'show') {
				data.episode = {
					ids: {
						trakt: item.id,
					},
				};
			} else {
				data.movie = {
					ids: {
						trakt: item.id,
					},
				};
			}
			data.progress = item.progress;
			await Requests.send({
				url: `${this.SCROBBLE_URL}${path}`,
				method: 'POST',
				body: data,
			});
			await EventDispatcher.dispatch('SCROBBLE_SUCCESS', null, {
				item: TraktItem.save(item),
				scrobbleType,
			});
		} catch (err) {
			if (Errors.validate(err)) {
				await EventDispatcher.dispatch('SCROBBLE_ERROR', null, {
					item: TraktItem.save(item),
					scrobbleType,
					error: err,
				});
			}
		}
	}
}

export const TraktScrobble = new _TraktScrobble();
