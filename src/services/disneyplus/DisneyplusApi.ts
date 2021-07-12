import { DisneyplusService } from '@/disneyplus/DisneyplusService';
import { ServiceApi } from '@api/ServiceApi';

class _DisneyplusApi extends ServiceApi {
	constructor() {
		super(DisneyplusService.id);
	}
}

export const DisneyplusApi = new _DisneyplusApi();
