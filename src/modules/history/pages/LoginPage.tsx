import { Button, CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { UtsCenter } from '../../../components/UtsCenter';
import { EventDispatcher } from '../../../common/Events';
import { Session } from '../../../common/Session';

export const LoginPage: React.FC = () => {
	const history = useHistory();
	const [isLoading, setLoading] = useState(true);

	const onLoginClick = async () => {
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
		void Session.checkLogin();
	}, []);

	return (
		<UtsCenter>
			{isLoading ? (
				<CircularProgress color="secondary" />
			) : (
				<Button color="secondary" onClick={onLoginClick} variant="contained">
					{browser.i18n.getMessage('login')}
				</Button>
			)}
		</UtsCenter>
	);
};
