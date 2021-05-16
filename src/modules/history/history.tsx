import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { ThemeWrapper } from '../../components/ThemeWrapper';
import './history.scss';
import { HistoryApp } from './HistoryApp';

const init = () => {
	Shared.pageType = 'popup';
	Requests.startListeners();
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<HistoryApp />
		</ThemeWrapper>,
		root
	);
};

init();
