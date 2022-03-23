import { PolsatboxgoPlService } from '@/polsatboxgo-pl/PolsatboxgoPlService';
import { ServiceApi } from '@apis/ServiceApi';

class _PolsatboxgoPlApi extends ServiceApi {
	constructor() {
		super(PolsatboxgoPlService.id);
	}
}

export const PolsatboxgoPlApi = new _PolsatboxgoPlApi();
