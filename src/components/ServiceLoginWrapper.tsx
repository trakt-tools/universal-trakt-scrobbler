import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { UtsCenter } from '@components/UtsCenter';
import { useHistory } from '@contexts/HistoryContext';
import { useSync } from '@contexts/SyncContext';
import { CircularProgress, Link } from '@material-ui/core';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

export const ServiceLoginWrapper: React.FC = ({ children }) => {
	const history = useHistory();
	const { service, api } = useSync();

	const [isLoading, setLoading] = useState(true);

	useEffect(() => {
		const checkLogin = async () => {
			if (!service || !api) {
				setLoading(false);
				return;
			}
			try {
				const isLoggedIn = await api.checkLogin();
				if (!isLoggedIn) {
					throw new Error('Not logged in');
				}
				setLoading(false);
			} catch (err) {
				history.push('/home');
				await EventDispatcher.dispatch('DIALOG_SHOW', null, {
					title: I18N.translate('notLoggedIn'),
					message: (
						<>
							{I18N.translate('notLoggedInDescription')}
							<br />
							<br />
							<Link href={service.homePage} target="_blank" rel="noopener">
								{service.homePage}
							</Link>
						</>
					),
				});
			}
		};

		void checkLogin();
	}, []);

	return isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<>{children}</>
	);
};

ServiceLoginWrapper.propTypes = {
	children: PropTypes.node.isRequired,
};
