import { Api } from '../common/Api';
import { VtmgoBeService } from './VtmgoBeService';

class _VtmgoBeApi extends Api {
	constructor() {
		super(VtmgoBeService.id);
	}
}

export const VtmgoBeApi = new _VtmgoBeApi();
