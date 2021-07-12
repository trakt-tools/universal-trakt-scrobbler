import { StreamzBeService } from '@/streamz-be/StreamzBeService';
import { Api } from '@common/Api';

class _StreamzBeApi extends Api {
	constructor() {
		super(StreamzBeService.id);
	}
}

export const StreamzBeApi = new _StreamzBeApi();
