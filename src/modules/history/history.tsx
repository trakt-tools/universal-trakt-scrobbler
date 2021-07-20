import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { ThemeWrapper } from '@components/ThemeWrapper';
import '@history/history.html';
import '@history/history.scss';
import { HistoryApp } from '@history/HistoryApp';
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
		<ThemeWrapper>
			<HistoryApp />
		</ThemeWrapper>,
		root
	);
};

Messaging.addHandlers({});

void init();
