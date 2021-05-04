import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { BrowserStorage } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { Messaging } from '../../common/Messaging';
import { Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { ThemeWrapper } from '../../components/ThemeWrapper';
import './history.scss';
import { HistoryApp } from './HistoryApp';

const init = async () => {
	Shared.pageType = 'popup';
	Shared.tabId = (await Messaging.toBackground({ action: 'get-tab-id' }))?.tabId;
	await BrowserStorage.sync();
	const values = await BrowserStorage.get('options');
	if (values.options && values.options.allowRollbar) {
		Errors.startRollbar();
	}
	Requests.startListeners();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<HistoryApp />
		</ThemeWrapper>,
		root
	);
};

void init();
