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
				'@typescript-eslint/no-var-requires': 'off',
			},
		},
		{
			files: ['**/*.{ts,tsx}'],
			parserOptions: {
				tsconfigRootDir: __dirname,
				project: ['./tsconfig.json'],
			},
			plugins: ['local-rules'],
			extends: [
				'eslint:recommended',
				'plugin:react/recommended',
				'plugin:@typescript-eslint/recommended',
				'plugin:@typescript-eslint/recommended-requiring-type-checking',
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
		},
	],
	settings: {
		react: {
			version: 'detect',
		},
	},
};
