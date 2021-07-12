import { DisneyplusService } from '@/disneyplus/DisneyplusService';
import { Api } from '@common/Api';

class _DisneyplusApi extends Api {
	constructor() {
		super(DisneyplusService.id);
	}
}

export const DisneyplusApi = new _DisneyplusApi();
