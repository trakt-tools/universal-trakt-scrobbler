import { Button, CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { UtsCenter } from '../../../components/UtsCenter';
import { Events, EventDispatcher } from '../../../services/Events';
import { Session } from '../../../services/Session';

const LoginPage: React.FC = () => {
	const history = useHistory();
	const [isLoading, setLoading] = useState(true);

	async function onLoginClick() {
		setLoading(true);
		await Session.login();
	}

	useEffect(() => {
		function startListeners() {
			EventDispatcher.subscribe(Events.LOGIN_SUCCESS, onLoginSuccess);
			EventDispatcher.subscribe(Events.LOGIN_ERROR, onLoginError);
		}

		function stopListeners() {
			EventDispatcher.unsubscribe(Events.LOGIN_SUCCESS, onLoginSuccess);
			EventDispatcher.unsubscribe(Events.LOGIN_ERROR, onLoginError);
		}

		function onLoginSuccess() {
			setLoading(false);
			history.push('/home');
		}

		function onLoginError() {
			setLoading(false);
		}

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

export { LoginPage };
