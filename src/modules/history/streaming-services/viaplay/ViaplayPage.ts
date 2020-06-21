import { ViaplayApi } from './ViaplayApi';
import { ViaplayStore } from './ViaplayStore';
import { Page } from '../common/Page';

function ViaplayPage(): React.ReactElement | null {
	return Page({ serviceName: 'Viaplay', store: ViaplayStore, api: ViaplayApi });
}

export { ViaplayPage };
