import { Api } from '../common/Api';
import * as VrtnuBe from './vrtnu-be.json';

class _VrtnuBeApi extends Api {
	constructor() {
		super(VrtnuBe.id);
	}
}

export const VrtnuBeApi = new _VrtnuBeApi();
