import { ServiceApi } from '@apis/ServiceApi';
import { Item } from '@models/Item';
import { PolsatboxgoPlService } from '@/polsatboxgo-pl/PolsatboxgoPlService';

class _PolsatboxgoPlApi extends ServiceApi {
	constructor() {
		super(PolsatboxgoPlService.id);
	}
}

export const PolsatboxgoPlApi = new _PolsatboxgoPlApi();
