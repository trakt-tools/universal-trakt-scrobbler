import { ServiceValues } from '@models/Service';
import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import { Manifest as WebExtManifest } from 'webextension-polyfill-ts';
import webpack from 'webpack';
import { ProgressPlugin } from 'webpack';
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
	callback: () => Promise<void>;

	constructor(callback: () => Promise<void>) {
		this.callback = callback;
	}

	apply = (compiler: webpack.Compiler) => {
		compiler.hooks.afterEmit.tapPromise('RunAfterBuild', this.callback);
	};
}

const plugins = {
	progress: ProgressPlugin,
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
			serviceEntries[serviceId] = [`./src/services/${serviceId}/${serviceId}.ts`];
		}
		serviceImports.push(`import '@/${serviceId}/${serviceKey}Service';`);
		apiImports.push(`import '@/${serviceId}/${serviceKey}Api';`);
	}
};

const getWebpackConfig = (env: Environment): webpack.Configuration => {
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
			background: ['./src/modules/background/background.ts'],
			trakt: ['./src/modules/content/trakt/trakt.ts'],
			popup: ['./src/modules/popup/popup.tsx'],
			history: ['./src/modules/history/history.tsx'],
			options: ['./src/modules/options/options.tsx'],
			...serviceEntries,
		},
		mode,
		module: {
			rules: [
				{
					test: /Shared\.ts$/,
					loader: 'string-replace-loader',
					options: {
						multiple: [
							{ search: '@@environment', replace: mode },
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
					test: /\.woff2?$/,
					type: 'asset/resource',
					generator: {
						filename: 'fonts/[name][ext]',
					},
				},
				{
					test: /\.html$/,
					type: 'asset/resource',
					generator: {
						filename: '[name][ext]',
					},
				},
				{
					test: /\.(jpg|png)$/,
					type: 'asset/resource',
					generator: {
						filename: 'images/[name][ext]',
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
			path: path.resolve(BASE_PATH, 'build', 'output'),
			clean: true,
		},
		plugins: [
			new plugins.progress(),
			...(env.test ? [] : [new plugins.runAfterBuild(() => runFinalSteps(env, config))]),
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
	const manifest: WebExtManifest.WebExtensionManifest & { key?: string } = {
		manifest_version: 2,
		name: 'Universal Trakt Scrobbler',
		version: packageJson.version,
		description: '__MSG_appDescription__',
		icons: {
			16: 'images/uts-icon-16.png',
			128: 'images/uts-icon-128.png',
		},
		background: {
			scripts: ['background.js'],
			persistent: true,
		},
		content_scripts: [
			{
				js: ['trakt.js'],
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
			...Object.values(services)
				.map((service) => service.hostPatterns)
				.flat(),
		],
		browser_action: {
			default_icon: {
				19: 'images/uts-icon-19.png',
				38: 'images/uts-icon-38.png',
			},
			default_popup: 'popup.html',
			default_title: 'Universal Trakt Scrobbler',
		},
		permissions: [
			'identity',
			'storage',
			'unlimitedStorage',
			'*://*.trakt.tv/*',
			'*://*.themoviedb.org/*',
			'*://*.uts.rafaelgomes.xyz/*',
		],
		web_accessible_resources: ['images/uts-icon-38.png', 'images/uts-icon-selected-38.png'],
		// Uncomment this to connect to react-devtools
		// content_security_policy: "script-src 'self' http://localhost:8097; object-src 'self'",
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

const runFinalSteps = async (env: Environment, config: Config) => {
	fs.copySync('./src/_locales', './build/output/_locales');

	const browsers = ['chrome', 'firefox'];
	for (const browser of browsers) {
		fs.copySync('./build/output', `./build/${browser}`);
		fs.writeFileSync(`./build/${browser}/manifest.json`, getManifest(config, browser));

		if (env.production) {
			const archive = archiver('zip', { zlib: { level: 9 } });
			await new Promise((resolve, reject) => {
				archive
					.pipe(fs.createWriteStream(path.resolve(BASE_PATH, 'dist', `${browser}.zip`)))
					.on('finish', () => resolve(null))
					.on('error', (err) => reject(err));
				archive.directory(path.resolve(BASE_PATH, `./build/${browser}`), false);
				void archive.finalize();
			});
		}
	}

	fs.rmSync('./build/output', { recursive: true });
};

export default getWebpackConfig;
