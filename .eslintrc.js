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
			extends: ['plugin:i18n-json/recommended'],
			rules: {
				'i18n-json/identical-keys': [
					'error',
					{
						filePath: path.resolve('./src/_locales/en/messages.json'),
					},
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
			plugins: ['local-rules'],
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
				'local-rules/prefer-arrow-functions': [
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
