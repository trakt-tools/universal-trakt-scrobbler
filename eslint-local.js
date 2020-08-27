// @ts-nocheck

const i18nJson = require('./local-eslint-plugins/eslint-plugin-i18n-json');

module.exports = {
	...i18nJson,
	rules: {
		...i18nJson.rules,
	},
};
