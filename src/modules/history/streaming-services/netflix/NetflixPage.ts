import { Page } from '../common/Page';
import { NetflixApi } from './NetflixApi';
import { NetflixStore } from './NetflixStore';

function NetflixPage(): React.ReactElement | null {
	return Page({ serviceName: 'Netflix', store: NetflixStore, api: NetflixApi });
}

export { NetflixPage };
