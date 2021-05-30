import { EventDispatcher } from '../common/Events';
import { RequestException, Requests } from '../common/Requests';
import { TraktItem } from '../models/TraktItem';
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

	async start(item: TraktItem): Promise<void> {
		await this.send(item, this.START);
	}

	async pause(item: TraktItem): Promise<void> {
		await this.send(item, this.PAUSE);
	}

	async stop(item: TraktItem): Promise<void> {
		await this.send(item, this.STOP);
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
			await EventDispatcher.dispatch('SCROBBLE_SUCCESS', null, { item, scrobbleType });
		} catch (err) {
			await EventDispatcher.dispatch('SCROBBLE_ERROR', null, {
				item,
				scrobbleType,
				error: err as RequestException,
			});
		}
	}
}

export const TraktScrobble = new _TraktScrobble();
