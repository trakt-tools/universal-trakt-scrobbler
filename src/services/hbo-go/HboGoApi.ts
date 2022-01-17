import { ServiceApi } from '@apis/ServiceApi';
import { Item } from '@models/Item';
import { HboGoService } from '@/hbo-go/HboGoService';

class _HboGoApi extends ServiceApi {
	constructor() {
		super(HboGoService.id);
	}
}

export const HboGoApi = new _HboGoApi();
