import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { useHistory } from '@contexts/HistoryContext';
import { createContext, useContext, useEffect, useState } from 'react';

export interface SessionProviderProps extends WithChildren {}

export interface SessionContextValue {
	isLoggedIn: boolean;
}

const getInitialValue = (): SessionContextValue => {
	return {
		isLoggedIn: Session.isLoggedIn,
	};
};

export const SessionContext = createContext(getInitialValue());

export const useSession = (): SessionContextValue => {
	const sessionContext = useContext(SessionContext);
	if (typeof sessionContext === 'undefined') {
		throw new Error('useSession() must be called from <SessionProvider/>');
	}
	return sessionContext;
};

export const SessionProvider = ({ children }: SessionProviderProps): JSX.Element => {
	const [value, setValue] = useState(getInitialValue());

	const history = useHistory();

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('LOGIN_SUCCESS', null, onLogin);
			Shared.events.subscribe('LOGOUT_SUCCESS', null, onLogout);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('LOGIN_SUCCESS', null, onLogin);
			Shared.events.unsubscribe('LOGOUT_SUCCESS', null, onLogout);
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
