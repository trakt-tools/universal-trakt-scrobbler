import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { NrkApi } from './NrkApi';

class _ScrobblerTemplateParser implements ScrobbleParser {
	parseItem = async (): Promise<Item | undefined> => {
		const player = await NrkApi.getSession();
		const id = player?.mediaItem.id;
		if (!id) {
			console.warn('no id');
			return;
		}
		const item = await NrkApi.getItem(id);
		console.warn('got item', item);
		return item;
	};
}

export const NrkParser = new _ScrobblerTemplateParser();

registerScrobbleParser('nrk', NrkParser);
