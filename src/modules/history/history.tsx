import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { AppWrapper } from '@components/AppWrapper';
import { HistoryApp } from '@history/HistoryApp';
import { GlobalStyles } from '@mui/material';
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
			<GlobalStyles
				styles={{
					html: {
						height: '100%',
					},

					body: {
						height: '100%',
					},

					'#root': {
						display: 'flex',
						flexDirection: 'column',
						height: '100%',
					},
				}}
			/>
			<HistoryApp />
		</AppWrapper>,
		root
	);
};

Messaging.addHandlers({});

void init();
