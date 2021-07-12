import { DisneyplusService } from '@/disneyplus/DisneyplusService';
import { ServiceApi } from '@apis/ServiceApi';

class _DisneyplusApi extends ServiceApi {
	constructor() {
		super(DisneyplusService.id);
	}
}

export const DisneyplusApi = new _DisneyplusApi();
