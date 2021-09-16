import { BrowserStorage, ThemeValue } from '@common/BrowserStorage';
import { EventDispatcher, StorageOptionsChangeData } from '@common/Events';
import '@fonts';
import { createTheme, CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import React from 'react';

interface ThemeWrapperProps {
	children: React.ReactNode;
}

export interface ThemeDetails {
	value: ThemeValue;
	palette: 'light' | 'dark';
}

export interface CustomTheme {
	sizes: {
		sidebar: number;
	};
}

declare module '@mui/material/styles' {
	interface Theme extends CustomTheme {}

	interface ThemeOptions extends CustomTheme {}
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

	const theme = createTheme({
		components: {
			MuiCssBaseline: {
				styleOverrides: {
					'*:focus': {
						outline: 'none',
					},

					body: {
						margin: 0,
					},
				},
			},
		},
		palette: {
			mode: themeDetails.palette,
		},
		sizes: {
			sidebar: 300,
		},
	});

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	);
};
