import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { Shared } from '../../common/Shared';
import { ThemeWrapper } from '../../components/ThemeWrapper';
import './popup.scss';
import { PopupApp } from './PopupApp';

const init = () => {
	Shared.pageType = 'popup';
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<PopupApp />
		</ThemeWrapper>,
		root
	);
};

init();
