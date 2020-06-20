import { ViaplayApi } from './ViaplayApi';
import { ViaplayStore } from './ViaplayStore';
import { Page } from '../common/Page';

function ViaplayPage() {
	return Page({ serviceName: 'Viaplay', store: ViaplayStore, api: ViaplayApi });
}

export { ViaplayPage };
