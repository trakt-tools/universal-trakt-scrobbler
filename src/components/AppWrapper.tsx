import { ErrorBoundary } from '@components/ErrorBoundary';
import { ThemeWrapper } from '@components/ThemeWrapper';
import { HistoryProvider } from '@contexts/HistoryContext';
import { SessionProvider } from '@contexts/SessionContext';
import React from 'react';

interface AppWrapperProps {
	usesHistory: boolean;
	usesSession: boolean;
	children: React.ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({
	usesHistory,
	usesSession,
	children,
}: AppWrapperProps) => {
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
