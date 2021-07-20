import { BrowserStorage, ThemeValue } from '@common/BrowserStorage';
import { EventDispatcher, StorageOptionsChangeData } from '@common/Events';
import { CssBaseline, useMediaQuery } from '@material-ui/core';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import React from 'react';

interface ThemeWrapperProps {
	children: React.ReactNode;
}

export interface ThemeDetails {
	value: ThemeValue;
	palette: 'light' | 'dark';
}

export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ children }: ThemeWrapperProps) => {
	const [themeDetails, setThemeDetails] = React.useState<ThemeDetails>({
		value: 'system',
		palette: 'light',
	});
	const prefersLightMode = useMediaQuery('(prefers-color-scheme: light)', { noSsr: true });
	const systemPalette = prefersLightMode ? 'light' : 'dark';

	React.useEffect(() => {
		const updateSystemPalette = () => {
			if (themeDetails.value === 'system' && themeDetails.palette !== systemPalette) {
				setThemeDetails({
					value: 'system',
					palette: systemPalette,
				});
			}
		};

		updateSystemPalette();
	}, [systemPalette]);

	React.useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const onStorageOptionsChange = (data: StorageOptionsChangeData) => {
			if (data.options && 'theme' in data.options) {
				setTheme();
			}
		};

		const setTheme = () => {
			const themeValue = BrowserStorage.options.theme;
			setThemeDetails((prevThemeDetails) => {
				if (prevThemeDetails.value === themeValue) {
					return prevThemeDetails;
				}
				const themePalette = themeValue === 'system' ? systemPalette : themeValue;
				return {
					value: themeValue,
					palette: themePalette,
				};
			});
		};

		startListeners();
		setTheme();
		return stopListeners;
	}, []);

	const theme = createMuiTheme({
		palette: {
			type: themeDetails.palette,
		},
	});

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	);
};
