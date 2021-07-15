import { ServiceValues } from '@models/Service';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as ProgressBarWebpackPlugin from 'progress-bar-webpack-plugin';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import * as webpack from 'webpack';
import configJson = require('./config.json');
import packageJson = require('./package.json');

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

const BASE_PATH = process.cwd();
const loaders = {
	css: {
		loader: 'css-loader',
	},
	sass: {
		loader: 'sass-loader',
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
	tsConfigPaths: TsconfigPathsPlugin,
};

const services: Record<string, ServiceValues> = {};
const serviceEntries: Record<string, string[]> = {};
const serviceImports: string[] = [];
const apiImports: string[] = [];

const loadServices = () => {
	const servicesDir = path.resolve(BASE_PATH, 'src', 'services');
	const serviceIds = fs.readdirSync(servicesDir).filter((fileName) => !fileName.endsWith('.ts'));
	for (const serviceId of serviceIds) {
		const serviceKey = serviceId
			.split('-')
			.map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
			.join('');
		const serviceDir = path.resolve(servicesDir, serviceId);
		const servicePath = path.resolve(serviceDir, `${serviceKey}Service.ts`);
		const serviceFile = fs.readFileSync(servicePath, 'utf-8');
		const serviceMatches = /Service\(([\S\s]+?)\)/m.exec(serviceFile);
		if (!serviceMatches) {
			throw new Error(`No service matches for ${serviceId}`);
		}
		const service = JSON.parse(
			serviceMatches[1]
				.replace(/\r?\n|\r|\t/g, '')
				.replace(/([{,])(\w+?):/g, '$1"$2":')
				.replace(/'/g, '"')
				.replace(/,([\]}])/g, '$1')
		) as ServiceValues;
		services[service.id] = service;

		if (service.hasScrobbler) {
			serviceEntries[`./chrome/js/${serviceId}`] = [`./src/services/${serviceId}/${serviceId}.ts`];
			serviceEntries[`./firefox/js/${serviceId}`] = [`./src/services/${serviceId}/${serviceId}.ts`];
		}
		serviceImports.push(`import '@/${serviceId}/${serviceKey}Service';`);
		apiImports.push(`import '@/${serviceId}/${serviceKey}Api';`);
	}
};

const getWebpackConfig = (env: Environment) => {
	loadServices();

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
			'./chrome/js/popup': ['./src/modules/popup/popup.tsx'],
			'./chrome/js/history': ['./src/modules/history/history.tsx'],
			'./chrome/js/options': ['./src/modules/options/options.tsx'],
			'./firefox/js/background': ['./src/modules/background/background.ts'],
			'./firefox/js/trakt': ['./src/modules/content/trakt/trakt.ts'],
			'./firefox/js/popup': ['./src/modules/popup/popup.tsx'],
			'./firefox/js/history': ['./src/modules/history/history.tsx'],
			'./firefox/js/options': ['./src/modules/options/options.tsx'],
			...serviceEntries,
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
					test: /apis\.ts$/,
					loader: 'string-replace-loader',
					options: {
						search: '// @import-services-apis',
						replace: apiImports.join('\n'),
					},
				},
				{
					test: /services\.ts$/,
					loader: 'string-replace-loader',
					options: {
						search: '// @import-services',
						replace: serviceImports.join('\n'),
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
					test: /\.scss$/,
					use: [loaders.style, loaders.css, loaders.sass],
				},
				{
					test: /\.css$/,
					use: [loaders.style, loaders.css],
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
			plugins: [new plugins.tsConfigPaths()],
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
		name: 'Universal Trakt Scrobbler',
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
			'cookies',
			'notifications',
			'tabs',
			'webRequest',
			'webRequestBlocking',
			'*://api.rollbar.com/*',
			'*://script.google.com/*',
			'*://script.googleusercontent.com/*',
			...Object.values(services)
				.map((service) => service.hostPatterns)
				.flat(),
		],
		browser_action: {
			default_icon: {
				19: 'images/uts-icon-19.png',
				38: 'images/uts-icon-38.png',
			},
			default_popup: 'html/popup.html',
			default_title: 'Universal Trakt Scrobbler',
		},
		permissions: ['identity', 'storage', 'unlimitedStorage', '*://*.trakt.tv/*'],
		web_accessible_resources: ['images/uts-icon-38.png', 'images/uts-icon-selected-38.png'],
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
