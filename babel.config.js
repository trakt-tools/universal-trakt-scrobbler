module.exports = {
	env: {
		production: {
			presets: [
				[
					'minify',
					{
						builtIns: false,
					},
				],
			],
		},
	},
	plugins: [
		[
			'@babel/plugin-transform-runtime',
			{
				regenerator: true,
			},
		],
	],
	presets: [
		'@babel/typescript',
		'@babel/preset-env',
		[
			'@babel/preset-react',
			{
				runtime: 'automatic',
			},
		],
	],
};
