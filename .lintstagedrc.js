module.exports = {
	'*.{css,html,md,yml,yaml}': 'prettier --write',
	'*.{js,jsx,ts,tsx,json}': ['biome check --write --no-errors-on-unmatched'],
};
