module.exports = {
	'*.{json,css,html,md,yml,yaml}': 'prettier --write',
	'*.{js,jsx,ts,tsx}': (filenames) => [
		'tsc --noEmit -p ./tsconfig.json',
		`eslint --fix --quiet -c ./.eslintrc.typed.js --no-eslintrc ${filenames.join(' ')}`,
	],
};
