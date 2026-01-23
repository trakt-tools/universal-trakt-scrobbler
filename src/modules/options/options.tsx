import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { AppWrapper } from '@components/AppWrapper';
import { OptionsApp } from '@options/OptionsApp';
import { createRoot } from 'react-dom/client';

Shared.pageType = 'popup';

Messaging.addListeners();

const init = async () => {
	await BrowserStorage.init();
	Errors.init();
	EventDispatcher.init();
	Messaging.init();
	const container = document.querySelector('#root');
	if (container) {
		const root = createRoot(container);
		root.render(
			<AppWrapper usesSession={false} usesRouting={false}>
				<OptionsApp />
			</AppWrapper>
		);
	}
};

Messaging.addHandlers({});

void init();
