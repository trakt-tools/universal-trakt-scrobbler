module.exports = {
	'*.{json,css,html,md,yml,yaml}': 'prettier --write',
	'*.{js,jsx,ts,tsx}': (fileNames) => [
		'tsc --noEmit -p ./tsconfig.json',
		`cross-env ESLINT_TYPED=true eslint --fix --quiet ${fileNames
			.map((fileName) => `"${fileName}"`)
			.join(' ')}`,
	],
};
