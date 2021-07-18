import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { ThemeWrapper } from '@components/ThemeWrapper';
import '@options/options.html';
import '@options/options.scss';
import { OptionsApp } from '@options/OptionsApp';
import React from 'react';
import ReactDOM from 'react-dom';

const init = () => {
	Shared.pageType = 'popup';
	Messaging.startListeners();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<OptionsApp />
		</ThemeWrapper>,
		root
	);
};

Messaging.messageHandlers = {};

init();
