import { useLocation, useNavigate } from 'react-router-dom';

export interface HistoryCompatible {
	push: (path: string) => void;
	replace: (path: string) => void;
	location: {
		pathname: string;
		search: string;
		hash: string;
	};
}

export const useHistory = (): HistoryCompatible => {
	const navigate = useNavigate();
	const location = useLocation();

	return {
		push: (path: string) => void navigate(path),
		replace: (path: string) => void navigate(path, { replace: true }),
		location: {
			pathname: location.pathname,
			search: location.search,
			hash: location.hash,
		},
	};
};
