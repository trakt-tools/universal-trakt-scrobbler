import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser, ScrobblePlayback } from '../common/ScrobbleParser';
import { NrkApi } from './NrkApi';

class _NrkParser extends ScrobbleParser {
	constructor() {
		super(NrkApi);
	}

	playbackFnToInject = () => {
		let playback: Partial<ScrobblePlayback> | null = null;
		const { player } = window;
		if (player) {
			const playbackSession = player.getPlaybackSession();
			if (playbackSession) {
				const { isPaused } = playbackSession.sequenceObserver;
				const { currentTime, duration } = playbackSession;
				if (duration) {
					playback = { isPaused, currentTime, duration };
				}
			}
		}
		return playback;
	};

	itemIdFnToInject = () => {
		let itemId: string | null = null;
		const { player } = window;
		if (player) {
			const playbackSession = player.getPlaybackSession();
			if (playbackSession) {
				itemId = playbackSession.mediaItem?.id ?? null;
			}
		}
		return itemId;
	};
}

export const NrkParser = new _NrkParser();

registerScrobbleParser('nrk', NrkParser);
