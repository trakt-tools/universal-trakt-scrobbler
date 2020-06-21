import { Page } from '../common/Page';
import { NetflixStore } from './NetflixStore';
import { NetflixApi } from './NetflixApi';

function NetflixPage(): React.ReactElement | null {
	return Page({ serviceName: 'Netflix', store: NetflixStore, api: NetflixApi });
}

export { NetflixPage };
