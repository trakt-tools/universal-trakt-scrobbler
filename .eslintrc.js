module.exports = {
	env: {
		browser: true,
		es2020: true,
		node: true,
		webextensions: true,
	},
	plugins: ['local-rules'],
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier/@typescript-eslint', // Disables TypeScript rules that conflict with Prettier.
		'plugin:prettier/recommended', // Displays Prettier errors as ESLint errors. **Make sure this is always the last configuration.**
	],
	rules: {
		'local-rules/prefer-arrow-functions': [
			'error',
			{
				disallowPrototype: true,
				classPropertiesAllowed: true,
			},
		],
	},
	overrides: [
		{
			files: ['**/*.js'],
			rules: {
				'@typescript-eslint/no-var-requires': 'off',
			},
		},
	],
	settings: {
		react: {
			version: 'detect',
		},
	},
};
