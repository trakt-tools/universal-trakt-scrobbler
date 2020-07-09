import { Page } from '../common/Page';
import { NrkApi } from './NrkApi';
import { NrkStore } from './NrkStore';

function NrkPage(): React.ReactElement | null {
	return Page({ serviceName: 'NRK', store: NrkStore, api: NrkApi });
}

export { NrkPage };
