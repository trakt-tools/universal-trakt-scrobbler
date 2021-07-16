import { NrkApi } from '@/nrk/NrkApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _NrkParser extends ScrobbleParser {
	constructor() {
		super(NrkApi, { videoPlayerSelector: '.tv-series-video-player video' });
	}

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
