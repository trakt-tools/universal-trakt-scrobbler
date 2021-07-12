import { VtmgoBeService } from '@/vtmgo-be/VtmgoBeService';
import { Api } from '@common/Api';

class _VtmgoBeApi extends Api {
	constructor() {
		super(VtmgoBeService.id);
	}
}

export const VtmgoBeApi = new _VtmgoBeApi();
