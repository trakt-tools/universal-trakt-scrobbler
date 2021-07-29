import { createHashHistory } from 'history';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

const history = createHashHistory();

export const HistoryContext = React.createContext(history);

export const useHistory = () => {
	const historyContext = useContext(HistoryContext);
	if (typeof historyContext === 'undefined') {
		throw new Error('useHistory() must be called from <HistoryProvider/>');
	}
	return historyContext;
};

export const HistoryProvider: React.FC = ({ children }) => {
	return <HistoryContext.Provider value={history}>{children}</HistoryContext.Provider>;
};

HistoryProvider.propTypes = {
	children: PropTypes.node.isRequired,
};
