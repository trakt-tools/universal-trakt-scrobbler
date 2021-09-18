import { ErrorBoundary } from '@components/ErrorBoundary';
import { ThemeWrapper } from '@components/ThemeWrapper';
import { HistoryProvider } from '@contexts/HistoryContext';
import { SessionProvider } from '@contexts/SessionContext';

interface AppWrapperProps extends WithChildren {
	usesHistory: boolean;
	usesSession: boolean;
}

export const AppWrapper = ({
	usesHistory,
	usesSession,
	children,
}: AppWrapperProps): JSX.Element => {
	let component = <>{children}</>;
	if (usesSession) {
		component = <SessionProvider>{component}</SessionProvider>;
	}
	if (usesHistory) {
		component = <HistoryProvider>{component}</HistoryProvider>;
	}
	return (
		<ErrorBoundary>
			<ThemeWrapper>{component}</ThemeWrapper>
		</ErrorBoundary>
	);
};
