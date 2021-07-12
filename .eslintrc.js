const path = require('path');

const ROOT_DIR = __dirname;
const SRC_DIR = path.resolve(ROOT_DIR, 'src');

const getTranslationsOverride = () => {
	return {
		files: ['**/_locales/**/*.json'],
		plugins: ['@rafaelgomesxyz/i18n-json'],
		extends: ['plugin:@rafaelgomesxyz/i18n-json/recommended'],
		rules: {
			'@rafaelgomesxyz/i18n-json/identical-keys': [
				'error',
				{
					filePath: path.resolve(SRC_DIR, '_locales', 'en', 'messages.json'),
					checkDuplicateValues: true,
				},
			],
		},
		settings: {
			'@rafaelgomesxyz/i18n-json/ignore-keys': {
				'**': ['*.description', '*.placeholders'],
				'**/pt_BR/**': ['serviceScrobble'],
			},
		},
	};
};

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
			'no-shadow': [
				'error',
				{
					hoist: 'all',
				},
			],
		},
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
	tsOverride.plugins = ['prefer-arrow'];
	tsOverride.extends.splice(tsOverride.extends.length - 1, 0, ...extendsArr);
	tsOverride.rules['@typescript-eslint/quotes'] = tsOverride.rules.quotes;
	tsOverride.rules.quotes = 'off';
	tsOverride.rules['@typescript-eslint/no-shadow'] = tsOverride.rules['no-shadow'];
	tsOverride.rules['no-shadow'] = 'off';
	tsOverride.rules['prefer-arrow/prefer-arrow-functions'] = 'error';

	return tsOverride;
};

module.exports = {
	env: {
		browser: true,
		es2020: true,
		node: true,
		webextensions: true,
	},
	rules: {},
	overrides: [getTranslationsOverride(), getJsOverride(), getTsOverride()],
	settings: {
		react: {
			version: 'detect',
		},
	},
};
