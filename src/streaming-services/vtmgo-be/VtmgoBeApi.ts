import { Api } from '../common/Api';
import * as VtmgoBe from './vtmgo-be.json';

class _VtmgoBeApi extends Api {
	constructor() {
		super(VtmgoBe.id);
	}
}

export const VtmgoBeApi = new _VtmgoBeApi();
