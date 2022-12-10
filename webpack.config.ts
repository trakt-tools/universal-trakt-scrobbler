import 'dotenv/config';
import { ServiceValues } from '@models/Service';
import archiver from 'archiver';
import CircularDependencyPlugin from 'circular-dependency-plugin';
import DotenvPlugin from 'dotenv-webpack';
import fs from 'fs-extra';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import { Manifest as WebExtManifest } from 'webextension-polyfill';
import webpack, { ProgressPlugin } from 'webpack';
import packageJson = require('./package.json');

interface Environment {
	development: boolean;
	production: boolean;
	test: boolean;
	watch: boolean;
}

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
	callback: () => Promise<void>;

	constructor(callback: () => Promise<void>) {
		this.callback = callback;
	}

	apply = (compiler: webpack.Compiler) => {
		compiler.hooks.afterEmit.tapPromise('RunAfterBuild', this.callback);
	};
}

const plugins = {
	circularDependency: CircularDependencyPlugin,
	dotenv: DotenvPlugin,
	html: HtmlWebpackPlugin,
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
		const { serviceDefinition } =
			/Service\((?<serviceDefinition>[\S\s]+?)\)/m.exec(serviceFile)?.groups ?? {};
		if (!serviceDefinition) {
			throw new Error(`No service matches for ${serviceId}`);
		}
		const service = JSON.parse(
			serviceDefinition
				.replace(/\r?\n|\r|\t/g, '')
				.replace(/(?<begin>[{,])(?<end>\w+?):/g, '$<begin>"$<end>":')
				.replace(/'/g, '"')
				.replace(/,(?<end>[\]}])/g, '$<end>')
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
					test: /\.pug$/,
					loader: 'pug-loader',
				},
				{
					test: /\.(?:jpg|png)$/,
					type: 'asset/resource',
					generator: {
						filename: 'images/[name][ext]',
					},
				},
				{
					test: /\.css$/,
					use: [loaders.style, loaders.css],
				},
				{
					test: /\.(?:t|j)sx?$/,
					exclude: /(?:node_modules|bower_components)/,
					loader: 'babel-loader',
					options: {
						envName: env.test ? 'test' : mode,
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
			new plugins.html({
				template: './src/templates/main.pug',
				templateParameters: {
					title: 'Universal Trakt Scrobbler - Popup',
					script: 'popup.js',
				},
				filename: 'popup.html',
				inject: false,
			}),
			new plugins.html({
				template: './src/templates/main.pug',
				templateParameters: {
					title: 'Universal Trakt Scrobbler - History',
					script: 'history.js',
				},
				filename: 'history.html',
				inject: false,
			}),
			new plugins.html({
				template: './src/templates/main.pug',
				templateParameters: {
					title: 'Universal Trakt Scrobbler - Options',
					script: 'options.js',
				},
				filename: 'options.html',
				inject: false,
			}),
			new plugins.circularDependency({
				exclude: /node_modules/,
				include: /src/,
				failOnError: true,
			}),
			new plugins.dotenv({
				systemvars: true,
			}),
			...(env.test ? [] : [new plugins.runAfterBuild(() => runFinalSteps(env))]),
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

const getManifest = (browserName: string): string => {
	const manifest: Partial<WebExtManifest.WebExtensionManifest> & { key?: string } = {
		name: 'Universal Trakt Scrobbler',
		version: packageJson.version,
		description: '__MSG_appDescription__',
		icons: {
			16: 'images/uts-icon-16.png',
			128: 'images/uts-icon-128.png',
		},
		content_scripts: [
			{
				js: ['trakt.js'],
				matches: ['*://*.trakt.tv/apps*'],
			},
		],
		default_locale: 'en',
	};
	switch (browserName) {
		case 'chrome': {
			manifest.manifest_version = 3;
			manifest.background = {
				service_worker: 'background.js',
			};
			manifest.optional_permissions = ['notifications', 'tabs'];
			// @ts-expect-error This is a newer key, so it's missing from the types.
			manifest.optional_host_permissions = [
				'*://api.rollbar.com/*',
				...Object.values(services)
					.map((service) => service.hostPatterns)
					.flat(),
			];
			manifest.permissions = ['alarms', 'identity', 'scripting', 'storage', 'unlimitedStorage'];
			manifest.host_permissions = [
				'*://*.trakt.tv/*',
				'*://*.themoviedb.org/*',
				'*://*.uts.rafaelgomes.xyz/*',
			];
			manifest.action = {
				default_icon: {
					19: 'images/uts-icon-19.png',
					38: 'images/uts-icon-38.png',
				},
				default_popup: 'popup.html',
				default_title: 'Universal Trakt Scrobbler',
			};
			if (process.env.CHROME_EXTENSION_KEY) {
				manifest.key = process.env.CHROME_EXTENSION_KEY;
			}
			break;
		}
		case 'firefox': {
			manifest.manifest_version = 2;
			manifest.background = {
				scripts: ['background.js'],
				persistent: false,
			};
			manifest.optional_permissions = [
				'cookies',
				'notifications',
				'tabs',
				'webRequest',
				'webRequestBlocking',
				'*://api.rollbar.com/*',
				...Object.values(services)
					.map((service) => service.hostPatterns)
					.flat(),
			];
			manifest.permissions = [
				'alarms',
				'identity',
				'storage',
				'unlimitedStorage',
				'*://*.trakt.tv/*',
				'*://*.themoviedb.org/*',
				'*://*.uts.rafaelgomes.xyz/*',
			];
			manifest.browser_action = {
				default_icon: {
					19: 'images/uts-icon-19.png',
					38: 'images/uts-icon-38.png',
				},
				default_popup: 'popup.html',
				default_title: 'Universal Trakt Scrobbler',
			};
			// Uncomment this to connect to react-devtools
			// manifest.content_security_policy =
			// 	"script-src 'self' http://localhost:8097; object-src 'self'";
			if (process.env.FIREFOX_EXTENSION_ID) {
				manifest.browser_specific_settings = {
					gecko: {
						id: process.env.FIREFOX_EXTENSION_ID,
					},
				};
			}
			break;
		}
	}
	return JSON.stringify(manifest, null, 2);
};

const runFinalSteps = async (env: Environment) => {
	fs.copySync('./src/_locales', './build/output/_locales');

	const browsers = ['chrome', 'firefox'];
	for (const browser of browsers) {
		fs.copySync('./build/output', `./build/${browser}`);
		fs.writeFileSync(`./build/${browser}/manifest.json`, getManifest(browser));

		if (env.production) {
			const distPath = path.resolve(BASE_PATH, 'dist');
			if (!fs.existsSync(distPath)) {
				fs.mkdirSync(distPath);
			}

			const archive = archiver('zip', { zlib: { level: 9 } });
			await new Promise((resolve, reject) => {
				archive
					.pipe(fs.createWriteStream(path.resolve(distPath, `${browser}.zip`)))
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
