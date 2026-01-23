import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { useHistory } from '@contexts/HistoryContext';
import { Navigate } from 'react-router-dom';

export interface LoginWrapperProps extends WithChildren {}

export const LoginWrapper = ({ children }: LoginWrapperProps): JSX.Element => {
	const history = useHistory();

	if (Session.isLoggedIn) {
		return <>{children}</>;
	}

	Shared.redirectPath = history.location.pathname;
	return <Navigate to="/login" replace />;
};
