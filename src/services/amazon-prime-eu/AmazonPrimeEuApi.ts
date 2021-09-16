import { AmazonPrimeEuService } from '@/amazon-prime-eu/AmazonPrimeEuService';
import { ServiceApi } from '@apis/ServiceApi';

class _AmazonPrimeEuApi extends ServiceApi {
	constructor() {
		super(AmazonPrimeEuService.id);
	}
}

export const AmazonPrimeEuApi = new _AmazonPrimeEuApi();
