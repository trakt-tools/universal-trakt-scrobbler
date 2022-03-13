import { ThemeValue } from '@common/BrowserStorage';
import { StorageOptionsChangeData } from '@common/Events';
import { Shared } from '@common/Shared';
import '@fonts';
import { createTheme, CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { useEffect, useState } from 'react';

interface ThemeWrapperProps extends WithChildren {}

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

export const ThemeWrapper = ({ children }: ThemeWrapperProps): JSX.Element => {
	const [themeDetails, setThemeDetails] = useState<ThemeDetails>({
		value: 'system',
		palette: 'light',
	});
	const prefersLightMode = useMediaQuery('(prefers-color-scheme: light)', { noSsr: true });
	const systemPalette = prefersLightMode ? 'light' : 'dark';

	useEffect(() => {
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

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const onStorageOptionsChange = (data: StorageOptionsChangeData) => {
			if (data.options && 'theme' in data.options) {
				setTheme();
			}
		};

		const setTheme = () => {
			const themeValue = Shared.storage.options.theme;
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
