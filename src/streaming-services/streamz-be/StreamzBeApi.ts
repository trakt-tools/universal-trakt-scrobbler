import { Api } from '../common/Api';
import { StreamzBeService } from './StreamzBeService';

class _StreamzBeApi extends Api {
	constructor() {
		super(StreamzBeService.id);
	}
}

export const StreamzBeApi = new _StreamzBeApi();
