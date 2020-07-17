import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { BrowserStorage } from '../../services/BrowserStorage';
import { Errors } from '../../services/Errors';
import { Shared } from '../../services/Shared';
import { PopupApp } from './PopupApp';

const init = async () => {
	Shared.isBackgroundPage = false;
	await BrowserStorage.sync();
	const values = await BrowserStorage.get('options');
	if (values.options && values.options.allowRollbar) {
		Errors.startRollbar();
	}
	const root = document.querySelector('#root');
	ReactDOM.render(<PopupApp />, root);
};

void init();
