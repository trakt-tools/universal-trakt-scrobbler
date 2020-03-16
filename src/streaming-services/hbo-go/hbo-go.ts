import { init } from '../common/content';
import { HboGoApi } from './HboGoApi';
import './HboGoEvents';

void init('hbo-go');

browser.runtime.onConnect.addListener((port) => {
	HboGoApi.getApiParams()
		.then((apiParams) => port.postMessage(apiParams))
		.catch(() => port.postMessage(undefined));
});
