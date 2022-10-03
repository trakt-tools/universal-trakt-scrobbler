import { StarplusService } from '@/starplus/StarplusService';
import { ServiceApi } from '@apis/ServiceApi';

class _StarplusApi extends ServiceApi {
	constructor() {
		super(StarplusService.id);
	}
}

export const StarplusApi = new _StarplusApi();
