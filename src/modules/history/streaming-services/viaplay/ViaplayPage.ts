import { Page } from '../common/Page';
import { ViaplayApi } from './ViaplayApi';
import { ViaplayStore } from './ViaplayStore';

function ViaplayPage(): React.ReactElement | null {
	return Page({ serviceName: 'Viaplay', store: ViaplayStore, api: ViaplayApi });
}

export { ViaplayPage };
