import { Api } from '../common/Api';
import * as StreamzBe from './streamz-be.json';

class _StreamzBeApi extends Api {
	constructor() {
		super(StreamzBe.id);
	}
}

export const StreamzBeApi = new _StreamzBeApi();
