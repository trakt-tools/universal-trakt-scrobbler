import { TraktItem } from '../models/TraktItem';
import { EventDispatcher, Events } from '../services/Events';
import { Messaging } from '../services/Messaging';
import { Requests } from '../services/Requests';
import { Shared } from '../services/Shared';
import { TraktApi } from './TraktApi';

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

	start = async (item: TraktItem): Promise<void> => {
		if (!Shared.isBackgroundPage) {
			await Messaging.toBackground({ action: 'start-scrobble' });
		}
		await this.send(item, this.START);
	};

	pause = async (item: TraktItem): Promise<void> => {
		await this.send(item, this.PAUSE);
	};

	stop = async (item: TraktItem): Promise<void> => {
		await this.send(item, this.STOP);
		if (!Shared.isBackgroundPage) {
			await Messaging.toBackground({ action: 'stop-scrobble' });
		}
	};

	send = async (item: TraktItem, scrobbleType: number): Promise<void> => {
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
			await EventDispatcher.dispatch(Events.SCROBBLE_SUCCESS, null, { item, scrobbleType });
		} catch (err) {
			await EventDispatcher.dispatch(Events.SCROBBLE_ERROR, null, {
				item,
				scrobbleType,
				error: err as Error,
			});
		}
	};
}

export const TraktScrobble = new _TraktScrobble();
