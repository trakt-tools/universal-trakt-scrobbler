import { ServiceApi } from '@apis/ServiceApi';
import { Item } from '@models/Item';
import { HotstarService } from '@/hotstar/HotstarService';

class _HotstarApi extends ServiceApi {
	constructor() {
		super(HotstarService.id);
	}
}

export const HotstarApi = new _HotstarApi();
