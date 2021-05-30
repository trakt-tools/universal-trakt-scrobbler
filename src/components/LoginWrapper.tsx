import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { Session } from '../common/Session';
import { Shared } from '../common/Shared';

class _LoginWrapper {
	wrap(componentBuilder: () => React.ReactNode): () => React.ReactNode {
		const LoginWrapperBuilder = () => {
			if (Session.isLoggedIn) {
				return componentBuilder();
			}
			Shared.redirectPath = Shared.history?.location.pathname;
			return <Redirect to="/login" />;
		};
		return LoginWrapperBuilder;
	}
}

export const LoginWrapper = new _LoginWrapper();
