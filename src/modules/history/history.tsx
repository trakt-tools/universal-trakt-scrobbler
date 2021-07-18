import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { ThemeWrapper } from '@components/ThemeWrapper';
import '@history/history.html';
import '@history/history.scss';
import { HistoryApp } from '@history/HistoryApp';
import React from 'react';
import ReactDOM from 'react-dom';

const init = () => {
	Shared.pageType = 'popup';
	Requests.startListeners();
	Messaging.startListeners();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<HistoryApp />
		</ThemeWrapper>,
		root
	);
};

Messaging.messageHandlers = {};

init();
