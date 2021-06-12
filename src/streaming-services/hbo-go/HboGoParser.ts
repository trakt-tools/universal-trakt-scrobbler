import { ScrobbleParser } from '../common/ScrobbleParser';
import { HboGoApi } from './HboGoApi';

class _HboGoParser extends ScrobbleParser {
	constructor() {
		super(HboGoApi);
	}

	itemIdFnToInject = () => {
		const id = window.sdk?.player.content?.Id ?? null;
		return id;
	};
}

export const HboGoParser = new _HboGoParser();
