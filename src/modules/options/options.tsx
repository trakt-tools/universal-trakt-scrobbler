import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../assets/assets';
import { Shared } from '../../common/Shared';
import { ThemeWrapper } from '../../components/ThemeWrapper';
import './options.scss';
import { OptionsApp } from './OptionsApp';

const init = () => {
	Shared.pageType = 'popup';
	const root = document.querySelector('#root');
	ReactDOM.render(
		<ThemeWrapper>
			<OptionsApp />
		</ThemeWrapper>,
		root
	);
};

init();
