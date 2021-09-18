import { createHashHistory } from 'history';
import { createContext, useContext } from 'react';

export interface HistoryProviderProps extends WithChildren {}

const history = createHashHistory();

export const HistoryContext = createContext(history);

export const useHistory = () => {
	const historyContext = useContext(HistoryContext);
	if (typeof historyContext === 'undefined') {
		throw new Error('useHistory() must be called from <HistoryProvider/>');
	}
	return historyContext;
};

export const HistoryProvider = ({ children }: HistoryProviderProps): JSX.Element => {
	return <HistoryContext.Provider value={history}>{children}</HistoryContext.Provider>;
};
