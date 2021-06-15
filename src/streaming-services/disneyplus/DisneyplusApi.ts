import { Api } from '../common/Api';
import { DisneyplusService } from './DisneyplusService';

class _DisneyplusApi extends Api {
	constructor() {
		super(DisneyplusService.id);
	}
}

export const DisneyplusApi = new _DisneyplusApi();
