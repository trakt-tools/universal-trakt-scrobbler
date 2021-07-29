import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { UtsCenter } from '@components/UtsCenter';
import { useHistory } from '@contexts/HistoryContext';
import { Button, CircularProgress } from '@material-ui/core';
import React, { useEffect, useState } from 'react';

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
			if (Shared.redirectPath) {
				history.push(Shared.redirectPath);
			} else {
				history.push('/home');
			}
		};

		const onLoginError = () => {
			setLoading(false);
		};

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const init = async () => {
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
