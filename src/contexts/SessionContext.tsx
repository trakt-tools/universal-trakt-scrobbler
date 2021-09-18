import { EventDispatcher } from '@common/Events';
import { Session } from '@common/Session';
import { useHistory } from '@contexts/HistoryContext';
import React, { useContext, useEffect, useState } from 'react';

export interface SessionProviderProps extends WithChildren {}

const initialValue = {
	isLoggedIn: Session.isLoggedIn,
};

export const SessionContext = React.createContext(initialValue);

export const useSession = () => {
	const sessionContext = useContext(SessionContext);
	if (typeof sessionContext === 'undefined') {
		throw new Error('useSession() must be called from <SessionProvider/>');
	}
	return sessionContext;
};

export const SessionProvider: React.FC = ({ children }: SessionProviderProps) => {
	const [value, setValue] = useState(initialValue);

	const history = useHistory();

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('LOGIN_SUCCESS', null, onLogin);
			EventDispatcher.subscribe('LOGOUT_SUCCESS', null, onLogout);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('LOGIN_SUCCESS', null, onLogin);
			EventDispatcher.unsubscribe('LOGOUT_SUCCESS', null, onLogout);
		};

		const onLogin = () => {
			setValue({ isLoggedIn: true });
		};

		const onLogout = () => {
			setValue({ isLoggedIn: false });
			history.push('/login');
		};

		startListeners();
		return stopListeners;
	}, []);

	return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
