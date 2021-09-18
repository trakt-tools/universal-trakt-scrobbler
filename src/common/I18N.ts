import browser from 'webextension-polyfill';

class _I18N {
	translate(name: MessageName, substitutions?: string | string[]): string {
		return browser.i18n.getMessage(name, substitutions);
	}
}

export const I18N = new _I18N();
