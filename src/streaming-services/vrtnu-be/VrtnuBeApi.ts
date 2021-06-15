import { Api } from '../common/Api';
import { VrtnuBeService } from './VrtnuBeService';

class _VrtnuBeApi extends Api {
	constructor() {
		super(VrtnuBeService.id);
	}
}

export const VrtnuBeApi = new _VrtnuBeApi();
