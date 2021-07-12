import { StreamzBeService } from '@/streamz-be/StreamzBeService';
import { ServiceApi } from '@api/ServiceApi';

class _StreamzBeApi extends ServiceApi {
	constructor() {
		super(StreamzBeService.id);
	}
}

export const StreamzBeApi = new _StreamzBeApi();
