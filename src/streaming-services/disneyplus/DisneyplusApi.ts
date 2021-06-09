import { Api } from '../common/Api';
import * as Disneyplus from './disneyplus.json';

class _DisneyplusApi extends Api {
	constructor() {
		super(Disneyplus.id);
	}
}

export const DisneyplusApi = new _DisneyplusApi();
