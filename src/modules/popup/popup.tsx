import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { ThemeWrapper } from '@components/ThemeWrapper';
import '@popup/popup.scss';
import { PopupApp } from '@popup/PopupApp';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

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

Messaging.messageHandlers = {
	'start-scrobble': (message) => {
		void EventDispatcher.dispatch('SCROBBLE_START', null, {
			item: message.item,
		});
	},

	'pause-scrobble': () => {
		void EventDispatcher.dispatch('SCROBBLE_PAUSE', null, {});
	},

	'stop-scrobble': () => {
		void EventDispatcher.dispatch('SCROBBLE_STOP', null, {});
	},

	'update-scrobbling-item': (message) => {
		void EventDispatcher.dispatch('SCROBBLING_ITEM_UPDATE', null, {
			scrobblingItem: message.item,
		});
	},
};

init();
