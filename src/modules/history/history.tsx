import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { RequestsManager } from '@common/RequestsManager';
import { Shared } from '@common/Shared';
import { AppWrapper } from '@components/AppWrapper';
import { HistoryApp } from '@history/HistoryApp';
import { GlobalStyles } from '@mui/material';
import { createRoot } from 'react-dom/client';

Shared.pageType = 'popup';

Messaging.addListeners();

const init = async () => {
	await BrowserStorage.init();
	Errors.init();
	EventDispatcher.init();
	RequestsManager.init();
	Messaging.init();
	const container = document.querySelector('#root');
	if (container) {
		const root = createRoot(container);
		root.render(
			<AppWrapper usesSession={true} usesRouting={true}>
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
			</AppWrapper>
		);
	}
};

Messaging.addHandlers({});

void init();
