import { VtmgoBeService } from '@/vtmgo-be/VtmgoBeService';
import { ServiceApi } from '@apis/ServiceApi';

class _VtmgoBeApi extends ServiceApi {
	constructor() {
		super(VtmgoBeService.id);
	}
}

export const VtmgoBeApi = new _VtmgoBeApi();
