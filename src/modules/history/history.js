import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { BrowserStorage } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { HistoryApp } from './HistoryApp';
import { Shared } from '../../services/Shared';

init();

async function init() {
	Shared.isBackgroundPage = false;
	await BrowserStorage.sync();
	const values = await BrowserStorage.get('options');
	if (values.options && values.options.allowRollbar) {
		Errors.startRollbar();
	}
	const root = document.querySelector('#root');
	ReactDOM.render(<HistoryApp />, root);
}
