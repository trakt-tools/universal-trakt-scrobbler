import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { ThemeWrapper } from '@components/ThemeWrapper';
import '@options/options.html';
import '@options/options.scss';
import { OptionsApp } from '@options/OptionsApp';
import React from 'react';
import ReactDOM from 'react-dom';

const init = async () => {
	Shared.pageType = 'popup';
	await BrowserStorage.init();
	Errors.init();
	Messaging.init();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<OptionsApp />
		</ThemeWrapper>,
		root
	);
};

Messaging.messageHandlers = {};

void init();
