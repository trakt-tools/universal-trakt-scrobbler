import { ScrobbleParser } from '@common/ScrobbleParser';
import { TetPlusApi } from '@/tet-plus/TetPlusApi';

class _TetPlusParser extends ScrobbleParser {
	constructor() {
		super(TetPlusApi, {
			watchingUrlRegex: /\/watch\/(?<id>\d+)/, // https://tet.plus/watch/1656568171208 => 1656568171208
		});
	}
}

export const TetPlusParser = new _TetPlusParser();
