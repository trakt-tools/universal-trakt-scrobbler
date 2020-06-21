import { NrkApi } from './NrkApi';
import { NrkStore } from './NrkStore';
import { Page } from '../common/Page';

function NrkPage(): React.ReactElement | null {
	return Page({ serviceName: 'NRK', store: NrkStore, api: NrkApi });
}

export { NrkPage };
