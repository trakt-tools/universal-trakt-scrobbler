import { HboGoService } from '@/hbo-go/HboGoService';
import { ServiceApi } from '@apis/ServiceApi';

class _HboGoApi extends ServiceApi {
	constructor() {
		super(HboGoService.id);
	}
}

export const HboGoApi = new _HboGoApi();
