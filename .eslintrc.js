const path = require('path');

module.exports = {
	env: {
		browser: true,
		es2020: true,
		node: true,
		webextensions: true,
	},
	rules: {},
	overrides: [
		{
			files: ['**/_locales/**/*.json'],
			plugins: ['@rafaelgomesxyz/i18n-json'],
			extends: ['plugin:@rafaelgomesxyz/i18n-json/recommended'],
			rules: {
				'@rafaelgomesxyz/i18n-json/identical-keys': [
					'error',
					{
						filePath: path.resolve('./src/_locales/en/messages.json'),
						checkDuplicateValues: true,
					},
				],
			},
			settings: {
				'@rafaelgomesxyz/i18n-json/ignore-keys': [
					'*.description',
					'*.placeholders',
					'serviceScrobble',
				],
			},
		},
		{
			files: ['**/*.{js,jsx}'],
			parserOptions: {
				sourceType: 'module',
			},
			extends: [
				'eslint:recommended',
				'plugin:react/recommended',
				'plugin:prettier/recommended', // Displays Prettier errors as ESLint errors. **Make sure this is always the last configuration.**
			],
			rules: {
				quotes: [
					'error',
					'single',
					{
						avoidEscape: true,
						allowTemplateLiterals: false,
					},
				],
			},
		},
		{
			files: ['**/*.{ts,tsx}'],
			plugins: ['prefer-arrow'],
			extends: [
				'eslint:recommended',
				'plugin:react/recommended',
				'plugin:@typescript-eslint/recommended',
				'prettier/@typescript-eslint', // Disables TypeScript rules that conflict with Prettier.
				'plugin:prettier/recommended', // Displays Prettier errors as ESLint errors. **Make sure this is always the last configuration.**
			],
			rules: {
				quotes: 'off',
				'@typescript-eslint/quotes': [
					'error',
					'single',
					{
						avoidEscape: true,
						allowTemplateLiterals: false,
					},
				],
				'prefer-arrow/prefer-arrow-functions': [
					'error',
					{
						disallowPrototype: true,
						classPropertiesAllowed: true,
					},
				],
			},
		},
	],
	settings: {
		react: {
			version: 'detect',
		},
	},
};
