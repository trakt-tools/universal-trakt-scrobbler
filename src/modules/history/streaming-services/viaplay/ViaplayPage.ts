import { Page } from '../common/Page';
import { ViaplayApi } from './ViaplayApi';
import { ViaplayStore } from './ViaplayStore';

export const ViaplayPage = (): React.ReactElement | null => {
	return Page({ serviceName: 'Viaplay', store: ViaplayStore, api: ViaplayApi });
};
