import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { AppWrapper } from '@components/AppWrapper';
import '@popup/popup.html';
import '@popup/popup.scss';
import { PopupApp } from '@popup/PopupApp';
import React from 'react';
import ReactDOM from 'react-dom';

const init = async () => {
	Shared.pageType = 'popup';
	await BrowserStorage.init();
	Errors.init();
	Requests.init();
	Messaging.init();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<AppWrapper usesHistory={true} usesSession={true}>
			<PopupApp />
		</AppWrapper>,
		root
	);
};

Messaging.addHandlers({});

void init();
