import { VtmgoBeService } from '@/vtmgo-be/VtmgoBeService';
import { ServiceApi } from '@api/ServiceApi';

class _VtmgoBeApi extends ServiceApi {
	constructor() {
		super(VtmgoBeService.id);
	}
}

export const VtmgoBeApi = new _VtmgoBeApi();
