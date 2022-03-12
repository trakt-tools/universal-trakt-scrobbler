import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { RequestsManager } from '@common/RequestsManager';
import { Shared } from '@common/Shared';
import { AppWrapper } from '@components/AppWrapper';
import { PopupApp } from '@popup/PopupApp';
import ReactDOM from 'react-dom';

const init = async () => {
	Shared.pageType = 'popup';
	await BrowserStorage.init();
	Errors.init();
	EventDispatcher.init();
	RequestsManager.init();
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
