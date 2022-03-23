import { KijkNlService } from '@/kijk-nl/KijkNlService';
import { ServiceApi } from '@apis/ServiceApi';

class _KijkNlApi extends ServiceApi {
	constructor() {
		super(KijkNlService.id);
	}
}

export const KijkNlApi = new _KijkNlApi();
