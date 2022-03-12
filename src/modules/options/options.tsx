import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { AppWrapper } from '@components/AppWrapper';
import { OptionsApp } from '@options/OptionsApp';
import ReactDOM from 'react-dom';

const init = async () => {
	Shared.pageType = 'popup';
	await BrowserStorage.init();
	Errors.init();
	EventDispatcher.init();
	Messaging.init();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<AppWrapper usesHistory={false} usesSession={false}>
			<OptionsApp />
		</AppWrapper>,
		root
	);
};

Messaging.addHandlers({});

void init();
