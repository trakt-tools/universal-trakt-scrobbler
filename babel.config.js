module.exports = {
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
