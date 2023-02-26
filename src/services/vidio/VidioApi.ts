import { ServiceApi } from '@apis/ServiceApi';
import { VidioService } from '@/vidio/VidioService';

class _VidioApi extends ServiceApi {
	constructor() {
		super(VidioService.id);
	}
}

export const VidioApi = new _VidioApi();
