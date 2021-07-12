import { VrtnuBeService } from '@/vrtnu-be/VrtnuBeService';
import { ServiceApi } from '@apis/ServiceApi';

class _VrtnuBeApi extends ServiceApi {
	constructor() {
		super(VrtnuBeService.id);
	}
}

export const VrtnuBeApi = new _VrtnuBeApi();
