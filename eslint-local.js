// @ts-nocheck

const preferArrow = require('./local-eslint-plugins/eslint-plugin-prefer-arrow');
const i18nJson = require('./local-eslint-plugins/eslint-plugin-i18n-json');

module.exports = {
	...i18nJson,
	rules: {
		'prefer-arrow-functions': preferArrow,
		...i18nJson.rules,
	},
};
