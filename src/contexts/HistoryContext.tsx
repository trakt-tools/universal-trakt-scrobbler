import { createHashHistory } from 'history';
import React, { useContext } from 'react';

export interface HistoryProviderProps extends WithChildren {}

const history = createHashHistory();

export const HistoryContext = React.createContext(history);

export const useHistory = () => {
	const historyContext = useContext(HistoryContext);
	if (typeof historyContext === 'undefined') {
		throw new Error('useHistory() must be called from <HistoryProvider/>');
	}
	return historyContext;
};

export const HistoryProvider: React.FC = ({ children }: HistoryProviderProps) => {
	return <HistoryContext.Provider value={history}>{children}</HistoryContext.Provider>;
};
