import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { useHistory } from '@contexts/HistoryContext';
import React from 'react';
import { Redirect } from 'react-router-dom';

export interface LoginWrapperProps extends WithChildren {}

export const LoginWrapper: React.FC = ({ children }: LoginWrapperProps) => {
	const history = useHistory();

	if (Session.isLoggedIn) {
		return <>{children}</>;
	}

	Shared.redirectPath = history.location.pathname;
	return <Redirect to="/login" />;
};
