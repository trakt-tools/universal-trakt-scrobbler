import { Button, CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { UtsCenter } from '../../../components/UtsCenter';
import { EventDispatcher, Events } from '../../../services/Events';
import { Session } from '../../../services/Session';

export const LoginPage: React.FC = () => {
	const history = useHistory();
	const [isLoading, setLoading] = useState(true);

	const onLoginClick = async () => {
		setLoading(true);
		await Session.login();
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe(Events.LOGIN_SUCCESS, onLoginSuccess);
			EventDispatcher.subscribe(Events.LOGIN_ERROR, onLoginError);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe(Events.LOGIN_SUCCESS, onLoginSuccess);
			EventDispatcher.unsubscribe(Events.LOGIN_ERROR, onLoginError);
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
