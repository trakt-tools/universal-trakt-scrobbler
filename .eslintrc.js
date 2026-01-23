const ROOT_DIR = __dirname;

const getJsOverride = () => {
	return {
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
			'no-shadow': [
				'error',
				{
					hoist: 'all',
				},
			],
			'prefer-named-capture-group': 'error',
			'react/jsx-uses-react': 'off',
			'react/react-in-jsx-scope': 'off',
		},
		overrides: [
			{
				files: ['**/src/**/*.{js,jsx,ts,tsx}'],
				rules: {
					'no-restricted-imports': [
						'error',
						{
							patterns: [
								{
									group: ['.*'],
									message:
										'Please use aliases instead of relative paths for imports (see tsconfig.json).',
								},
							],
						},
					],
				},
			},
		],
	};
};

const getTsOverride = () => {
	const tsOverride = getJsOverride();
	const extendsArr = [
		'plugin:@typescript-eslint/recommended',
		'prettier', // Disables TypeScript rules that conflict with Prettier.
	];

	if (process.env.ESLINT_TYPED === 'true') {
		tsOverride.parserOptions = {
			tsconfigRootDir: ROOT_DIR,
			project: ['./tsconfig.json'],
		};
		extendsArr.splice(
			extendsArr.length - 1,
			0,
			'plugin:@typescript-eslint/recommended-requiring-type-checking'
		);
	} else {
		delete tsOverride.parserOptions;
	}

	tsOverride.files = ['**/*.{ts,tsx}'];
	tsOverride.plugins = ['mui', 'prefer-arrow'];
	tsOverride.extends.splice(tsOverride.extends.length - 1, 0, ...extendsArr);
	tsOverride.rules['mui/sort-sx-keys'] = 'error';
	tsOverride.rules['@typescript-eslint/quotes'] = tsOverride.rules.quotes;
	tsOverride.rules.quotes = 'off';
	tsOverride.rules['@typescript-eslint/no-shadow'] = tsOverride.rules['no-shadow'];
	tsOverride.rules['no-shadow'] = 'off';
	tsOverride.rules['prefer-arrow/prefer-arrow-functions'] = 'error';
	tsOverride.rules['@typescript-eslint/no-empty-interface'] = 'warn';
	tsOverride.rules['@typescript-eslint/no-unused-vars'] = [
		'error',
		{
			argsIgnorePattern: '^_',
			varsIgnorePattern: '^_',
		},
	];

	return tsOverride;
};

module.exports = {
	env: {
		browser: true,
		es2020: true,
		node: true,
	},
	rules: {},
	overrides: [getJsOverride(), getTsOverride()],
	settings: {
		react: {
			version: 'detect',
		},
	},
};
