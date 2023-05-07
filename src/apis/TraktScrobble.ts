import { TraktApi } from '@apis/TraktApi';
import { Shared } from '@common/Shared';
import { createScrobbleItem, ScrobbleItem } from '@models/Item';
import { TraktScrobbleItem } from '@models/TraktItem';

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

	async start(item: ScrobbleItem): Promise<void> {
		if (!item.trakt) {
			return;
		}
		await this.send(item.trakt, this.START);
		let { scrobblingDetails } = await Shared.storage.get('scrobblingDetails');
		if (scrobblingDetails?.tabId === Shared.tabId) {
			scrobblingDetails.isPaused = false;
		} else {
			scrobblingDetails = {
				item: item.save(),
				tabId: Shared.tabId,
				isPaused: false,
			};
		}
		await Shared.storage.set({ scrobblingDetails }, false);
		await Shared.events.dispatch('SCROBBLE_START', null, scrobblingDetails);
	}

	async pause(item: ScrobbleItem): Promise<void> {
		if (!item.trakt) {
			return;
		}
		await this.send(item.trakt, this.PAUSE);
		const { scrobblingDetails } = await Shared.storage.get('scrobblingDetails');
		if (scrobblingDetails) {
			scrobblingDetails.isPaused = true;
			await Shared.storage.set({ scrobblingDetails }, false);
			await Shared.events.dispatch('SCROBBLE_PAUSE', null, scrobblingDetails);
		}
	}

	async stop(item?: ScrobbleItem): Promise<void> {
		const { scrobblingDetails } = await Shared.storage.get('scrobblingDetails');
		if (!scrobblingDetails) {
			return;
		}
		if (!item) {
			item = createScrobbleItem(scrobblingDetails.item);
		}
		if (!item) {
			return;
		}
		if (item.trakt) {
			await this.send(item.trakt, this.STOP);
		}
		await Shared.storage.remove('scrobblingDetails', false);
		await Shared.events.dispatch('SCROBBLE_STOP', null, scrobblingDetails);
	}

	async send(item: TraktScrobbleItem, scrobbleType: number): Promise<void> {
		const path = this.paths[scrobbleType];
		try {
			const data: TraktScrobbleData = {
				[item.type]: {
					ids: {
						trakt: item.id,
					},
				},
				progress: item.progress,
			};
			await this.activate();
			await this.requests.send({
				url: `${this.SCROBBLE_URL}${path}`,
				method: 'POST',
				body: data,
			});
			await Shared.events.dispatch('SCROBBLE_SUCCESS', null, {
				item: item.save(),
				scrobbleType,
			});
		} catch (err) {
			if (Shared.errors.validate(err)) {
				await Shared.events.dispatch('SCROBBLE_ERROR', null, {
					item: item.save(),
					scrobbleType,
					error: err,
				});
			}
		}
	}
}

export const TraktScrobble = new _TraktScrobble();
