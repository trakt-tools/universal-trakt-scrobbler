import { CssBaseline } from '@material-ui/core';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import * as React from 'react';
import { BrowserStorage } from '../common/BrowserStorage';

export const ThemeWrapper: React.FC = ({ children }) => {
	const [themePalette, setThemePalette] = React.useState<'light' | 'dark'>('light');

	React.useEffect(() => {
		const setDarkTheme = async () => {
			const { options } = await BrowserStorage.get('options');
			if (options?.useDarkTheme) {
				setThemePalette('dark');
			}
		};

		void setDarkTheme();
	}, []);

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
				const { useDarkTheme } = options.newValue;
				setThemePalette((prevThemePalette) => {
					if (useDarkTheme && prevThemePalette === 'light') {
						return 'dark';
					}
					if (!useDarkTheme && prevThemePalette === 'dark') {
						return 'light';
					}
					return prevThemePalette;
				});
			}
		};

		startListeners();
		return stopListeners;
	}, []);

	const theme = createMuiTheme({
		palette: {
			type: themePalette,
		},
	});

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	);
};
