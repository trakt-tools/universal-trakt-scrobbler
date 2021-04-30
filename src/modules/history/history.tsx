import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { BrowserStorage } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { Shared } from '../../common/Shared';
import { ThemeWrapper } from '../../components/ThemeWrapper';
import './history.scss';
import { HistoryApp } from './HistoryApp';

const init = async () => {
	Shared.pageType = 'popup';
	await BrowserStorage.sync();
	const values = await BrowserStorage.get('options');
	if (values.options && values.options.allowRollbar) {
		Errors.startRollbar();
	}
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<HistoryApp />
		</ThemeWrapper>,
		root
	);
};

void init();
