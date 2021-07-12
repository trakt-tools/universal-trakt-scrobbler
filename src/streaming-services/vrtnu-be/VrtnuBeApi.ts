import { VrtnuBeService } from '@/vrtnu-be/VrtnuBeService';
import { Api } from '@common/Api';

class _VrtnuBeApi extends Api {
	constructor() {
		super(VrtnuBeService.id);
	}
}

export const VrtnuBeApi = new _VrtnuBeApi();
