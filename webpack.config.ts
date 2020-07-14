interface Environment {
	development: boolean;
	production: boolean;
	test: boolean;
	watch: boolean;
}

interface Config {
	clientId: string;
	clientSecret: string;
	rollbarToken: string;
	tmdbApiKey: string;
	chromeExtensionId?: string;
	chromeExtensionKey?: string;
	firefoxExtensionId?: string;
}

type Manifest = Omit<
	browser.runtime.Manifest,
	'background' | 'languages' | 'optional_permissions' | 'permissions'
> & {
	background?: {
		scripts: string[];
		persistent: boolean;
	};
	optional_permissions?: string[];
	permissions?: string[];
};

import * as fs from 'fs-extra';
import * as path from 'path';
import * as webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import * as ProgressBarWebpackPlugin from 'progress-bar-webpack-plugin';
import * as packageJson from './package.json';
import * as configJson from './config.json';

const BASE_PATH = process.cwd();
const loaders = {
	css: {
		loader: 'css-loader',
	},
	style: {
		loader: 'style-loader',
		options: {
			injectType: 'singletonStyleTag',
			insert: 'html',
		},
	},
};

class RunAfterBuildPlugin {
	callback: () => void;

	constructor(callback: () => void) {
		this.callback = callback;
	}

	apply = (compiler: webpack.Compiler) => {
		compiler.hooks.afterEmit.tap('RunAfterBuild', this.callback);
	};
}

const plugins = {
	clean: CleanWebpackPlugin,
	progressBar: ProgressBarWebpackPlugin,
	runAfterBuild: RunAfterBuildPlugin,
};

const getWebpackConfig = (env: Environment) => {
	let mode: 'production' | 'development';
	if (env.production) {
		mode = 'production';
	} else {
		mode = 'development';
	}
	const config = configJson[mode];
	return {
		devtool: env.production ? false : 'source-map',
		entry: {
			'./chrome/js/background': ['./src/modules/background/background.ts'],
			'./chrome/js/trakt': ['./src/modules/content/trakt/trakt.ts'],
			'./chrome/js/history': ['./src/modules/history/history.tsx'],
			'./firefox/js/background': ['./src/modules/background/background.ts'],
			'./firefox/js/trakt': ['./src/modules/content/trakt/trakt.ts'],
			'./firefox/js/history': ['./src/modules/history/history.tsx'],
		},
		mode,
		module: {
			rules: [
				{
					test: /secrets\.ts$/,
					loader: 'string-replace-loader',
					options: {
						multiple: [
							{ search: '@@clientId', replace: config.clientId },
							{ search: '@@clientSecret', replace: config.clientSecret },
							{ search: '@@rollbarToken', replace: config.rollbarToken },
							{ search: '@@tmdbApiKey', replace: config.tmdbApiKey },
						],
					},
				},
				{
					test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
					loader: 'file-loader',
					options: {
						name: '[name].[ext]',
						outputPath: './fonts',
						publicPath: '../fonts/',
					},
				},
				{
					test: /\.(jpg|png)$/,
					loader: 'file-loader',
					options: {
						name: '[name].[ext]',
						outputPath: './images/',
						publicPath: '../images/',
					},
				},
				{
					test: /\.css$/,
					loaders: [loaders.style, loaders.css],
				},
				{
					test: /\.(t|j)sx?$/,
					exclude: /(node_modules|bower_components)/,
					loader: 'babel-loader',
					options: {
						envName: env.test ? 'test' : mode,
						presets: ['@babel/typescript', '@babel/preset-env', '@babel/preset-react'],
					},
				},
			],
		},
		output: {
			filename: '[name].js',
			path: path.resolve(BASE_PATH, 'build'),
		},
		plugins: [
			new plugins.clean(),
			new plugins.progressBar(),
			...(env.test ? [] : [new plugins.runAfterBuild(() => runFinalSteps(config))]),
		],
		resolve: {
			extensions: ['.js', '.ts', '.tsx', '.json'],
		},
		watch: !!(env.development && env.watch),
		watchOptions: {
			aggregateTimeout: 1000,
			ignored: /node_modules/,
			poll: 1000,
		},
	};
};

const getManifest = (config: Config, browserName: string): string => {
	const manifest: Manifest = {
		manifest_version: 2,
		name: '__MSG_appName__',
		version: packageJson.version,
		description: '__MSG_appDescription__',
		icons: {
			16: 'images/uts-icon-16.png',
			128: 'images/uts-icon-128.png',
		},
		background: {
			scripts: ['js/lib/browser-polyfill.js', 'js/background.js'],
			persistent: true,
		},
		content_scripts: [
			{
				js: ['js/lib/browser-polyfill.js', 'js/trakt.js'],
				matches: ['*://*.trakt.tv/apps*'],
				run_at: 'document_start',
			},
		],
		default_locale: 'en',
		optional_permissions: [
			'*://api.rollbar.com/*',
			'*://script.google.com/*',
			'*://script.googleusercontent.com/*',
			'cookies',
			'webRequest',
			'webRequestBlocking',
		],
		browser_action: {
			default_icon: {
				19: 'images/uts-icon-19.png',
				38: 'images/uts-icon-38.png',
			},
		},
		permissions: [
			'identity',
			'storage',
			'tabs',
			'unlimitedStorage',
			'*://*.trakt.tv/*',
			'*://*.netflix.com/*',
			'*://tv.nrk.no/*',
			'*://*.viaplay.no/*',
		],
		web_accessible_resources: [
			'images/uts-icon-38.png',
			'images/uts-icon-selected-38.png',
			'images/svg/*.svg',
		],
	};
	switch (browserName) {
		case 'chrome': {
			if (config.chromeExtensionKey) {
				manifest.key = config.chromeExtensionKey;
			}
			break;
		}
		case 'firefox': {
			if (config.firefoxExtensionId) {
				manifest.browser_specific_settings = {
					gecko: {
						id: config.firefoxExtensionId,
					},
				};
			}
			break;
		}
	}
	return JSON.stringify(manifest, null, 2);
};

const runFinalSteps = (config: Config) => {
	if (!fs.existsSync('./build/chrome/js/lib')) {
		fs.mkdirSync('./build/chrome/js/lib');
	}
	if (!fs.existsSync('./build/firefox/js/lib')) {
		fs.mkdirSync('./build/firefox/js/lib');
	}
	const filesToCopy = [
		{
			from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
			to: './build/chrome/js/lib/browser-polyfill.js',
			flatten: true,
		},
		{
			from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
			to: './build/firefox/js/lib/browser-polyfill.js',
			flatten: true,
		},
	];
	for (const fileToCopy of filesToCopy) {
		fs.copyFileSync(fileToCopy.from, fileToCopy.to);
	}
	const foldersToCopy = [
		{ from: './src/_locales', to: './build/chrome/_locales' },
		{ from: './build/fonts', to: './build/chrome/fonts' },
		{ from: './src/html', to: './build/chrome/html' },
		{ from: './build/images', to: './build/chrome/images' },
		{ from: './src/_locales', to: './build/firefox/_locales' },
		{ from: './build/fonts', to: './build/firefox/fonts' },
		{ from: './src/html', to: './build/firefox/html' },
		{ from: './build/images', to: './build/firefox/images' },
	];
	for (const folderToCopy of foldersToCopy) {
		fs.copySync(folderToCopy.from, folderToCopy.to);
	}
	const filesToCreate = [
		{
			data: getManifest(config, 'chrome'),
			path: './build/chrome/manifest.json',
		},
		{
			data: getManifest(config, 'firefox'),
			path: './build/firefox/manifest.json',
		},
	];
	for (const fileToCreate of filesToCreate) {
		fs.writeFileSync(fileToCreate.path, fileToCreate.data);
	}
};

export default getWebpackConfig;
