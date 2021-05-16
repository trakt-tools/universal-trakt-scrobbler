import { Button, CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { Errors } from '../../../common/Errors';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import { Session } from '../../../common/Session';
import { UtsCenter } from '../../../components/UtsCenter';

export const LoginPage: React.FC = () => {
	const history = useHistory();
	const [isLoading, setLoading] = useState(true);

	const onLoginClick = async (): Promise<void> => {
		setLoading(true);
		await Session.login();
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('LOGIN_SUCCESS', null, onLoginSuccess);
			EventDispatcher.subscribe('LOGIN_ERROR', null, onLoginError);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('LOGIN_SUCCESS', null, onLoginSuccess);
			EventDispatcher.unsubscribe('LOGIN_ERROR', null, onLoginError);
		};

		const onLoginSuccess = () => {
			setLoading(false);
			history.push('/home');
		};

		const onLoginError = () => {
			setLoading(false);
		};

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const init = async () => {
			await BrowserStorage.init();
			if (BrowserStorage.options.allowRollbar) {
				Errors.startRollbar();
			}
			await Session.checkLogin();
		};

		void init();
	}, []);

	return (
		<UtsCenter>
			{isLoading ? (
				<CircularProgress color="secondary" />
			) : (
				<Button color="secondary" onClick={onLoginClick} variant="contained">
					{I18N.translate('login')}
				</Button>
			)}
		</UtsCenter>
	);
};
