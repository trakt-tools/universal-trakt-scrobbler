import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { Messaging } from '../../common/Messaging';
import { Shared } from '../../common/Shared';
import { ThemeWrapper } from '../../components/ThemeWrapper';
import './popup.scss';
import { PopupApp } from './PopupApp';

const init = () => {
	Shared.pageType = 'popup';
	Messaging.startListeners();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<PopupApp />
		</ThemeWrapper>,
		root
	);
};

Messaging.messageHandlers = {};

init();
