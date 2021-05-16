import { CssBaseline, useMediaQuery } from '@material-ui/core';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import * as React from 'react';
import { BrowserStorage, ThemeValue } from '../common/BrowserStorage';

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
		const setTheme = () => {
			const themeValue = BrowserStorage.options.theme;
			const themePalette = themeValue === 'system' ? systemPalette : themeValue;
			setThemeDetails({
				value: themeValue,
				palette: themePalette,
			});
		};

		setTheme();
	}, []);

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
			browser.storage.onChanged.addListener(onStorageChanged);
		};

		const stopListeners = () => {
			browser.storage.onChanged.removeListener(onStorageChanged);
		};

		const onStorageChanged = (
			changes: browser.storage.ChangeDict,
			areaName: browser.storage.StorageName
		) => {
			if (areaName !== 'local') {
				return;
			}
			const { options } = changes;
			if (options) {
				const { theme: themeValue } = options.newValue as { theme: ThemeValue };
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
			}
		};

		startListeners();
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
