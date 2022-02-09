import { ServiceApi } from '@apis/ServiceApi';
import { Item } from '@models/Item';
import { KijkNlService } from '@/kijk-nl/KijkNlService';

class _KijkNlApi extends ServiceApi {
	constructor() {
		super(KijkNlService.id);
	}
}

export const KijkNlApi = new _KijkNlApi();
