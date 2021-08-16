import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { useHistory } from '@contexts/HistoryContext';
import PropTypes from 'prop-types';
import React from 'react';
import { Redirect } from 'react-router-dom';

export const LoginWrapper: React.FC = ({ children }) => {
	const history = useHistory();

	if (Session.isLoggedIn) {
		return <>{children}</>;
	}

	Shared.redirectPath = history.location.pathname;
	return <Redirect to="/login" />;
};

LoginWrapper.propTypes = {
	children: PropTypes.node.isRequired,
};
