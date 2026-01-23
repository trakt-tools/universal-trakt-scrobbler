import { ErrorBoundary } from '@components/ErrorBoundary';
import { ThemeWrapper } from '@components/ThemeWrapper';
import { SessionProvider } from '@contexts/SessionContext';
import { HashRouter } from 'react-router-dom';

interface AppWrapperProps extends WithChildren {
	usesSession: boolean;
	usesRouting: boolean;
}

export const AppWrapper = ({
	usesSession,
	usesRouting,
	children,
}: AppWrapperProps): JSX.Element => {
	let component = <>{children}</>;
	if (usesSession) {
		component = <SessionProvider>{component}</SessionProvider>;
	}
	if (usesRouting) {
		component = <HashRouter>{component}</HashRouter>;
	}
	return (
		<ErrorBoundary>
			<ThemeWrapper>{component}</ThemeWrapper>
		</ErrorBoundary>
	);
};
