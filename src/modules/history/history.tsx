import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { Messaging } from '../../common/Messaging';
import { Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { ThemeWrapper } from '../../components/ThemeWrapper';
import './history.scss';
import { HistoryApp } from './HistoryApp';

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
