const commander = require('commander');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const prettier = require('prettier');

const BASE_PATH = __dirname;
const CURRENT_PATH = process.cwd();

const templatesPath = path.resolve(BASE_PATH, 'templates');
const servicesPath = path.resolve(CURRENT_PATH, 'src', 'streaming-services');

/**
 * @typedef {Object} StreamingService
 * @property {string} name
 * @property {string} id
 * @property {string} homePage
 * @property {boolean} hasScrobbler
 * @property {boolean} hasSync
 * @property {boolean} hasAutoSync
 */

/**
 * @param {string} name
 */
const generateId = (name) => {
	return name.replace(/\s/g, '-').toLowerCase();
};

/**
 * @param {string} id
 */
const generateKey = (id) => {
	return id
		.split('-')
		.map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
		.join('');
};

/**
 * @param {string} homePage
 */
const generateHostPatterns = (homePage) => {
	return [homePage.replace(/^https?:\/\/(wwww\.)?/, '*://*.').replace(/\/?$/, '/*')];
};

/**
 * @param {string} template
 * @param {string} serviceId
 * @param {string} serviceKey
 */
const replaceTemplate = (template, serviceId, serviceKey) => {
	return template
		.replace(/(scrobbler-)?(sync-)?template/g, serviceId)
		.replace(/(Scrobbler)?(Sync)?Template/g, serviceKey);
};

/**
 * @param {(value: string) => boolean | string} validator
 */
const validateArg = (validator) => {
	return (/** @type {string} */ value) => {
		const result = validator(value);
		if (typeof result === 'string') {
			throw new commander.InvalidOptionArgumentError(result);
		}
		return value;
	};
};

/**
 * @param {string} id
 */
const validateId = (id) => {
	if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id)) {
		return 'IDs must contain only lowercase letters, numbers or dash (-), and not begin or end with a dash';
	}

	const servicePath = path.resolve(servicesPath, id);
	if (fs.existsSync(servicePath)) {
		return 'Service already exists or ID is already being used by another service';
	}

	return true;
};

/**
 * @param {string[]} rawArgs
 * @returns {StreamingService}
 */
const parseArgsIntoOptions = (rawArgs) => {
	const args = commander.program
		.description('Create a new streaming service')
		.option('-n, --name <name>', 'the name of the service')
		.option(
			'-i, --id <id>',
			'a unique ID for the service (automatically generated based on the name if not provided)',
			validateArg(validateId)
		)
		.option('-h, --home-page <home-page>', 'the URL for the home page of the service')
		.option('-a, --has-scrobbler', 'if the service will have a scrobbler function')
		.option('-b, --has-sync', 'if the service will have a sync function')
		.option('-c, --has-auto-sync', 'if the service will have an auto sync function')
		.parse(rawArgs)
		.opts();

	return {
		name: args.name ?? '',
		id: args.id ?? (args.name && generateId(args.name)) ?? '',
		homePage: args.homePage ?? '',
		hasScrobbler: args.hasScrobbler ?? false,
		hasSync: args.hasSync ?? false,
		hasAutoSync: args.hasAutoSync ?? false,
	};
};

/**
 * @param {Partial<StreamingService>} options
 * @returns {Promise<StreamingService>}
 */
const promptForMissingOptions = async (options) => {
	const questions = [];
	if (!options.name) {
		questions.push({
			type: 'input',
			name: 'name',
			message: 'Enter the name of the service:',
		});
	}
	if (!options.id) {
		questions.push({
			type: 'input',
			name: 'id',
			message: 'Enter a unique ID for the service:',
			default: (/** @type {Record<string, unknown>} */ answers) => {
				return generateId(/** @type {string} */ (answers.name));
			},
			validate: (/** @type {string} */ input) => validateId(input),
		});
	}
	if (!options.homePage) {
		questions.push({
			type: 'input',
			name: 'homePage',
			message: 'Enter the URL for the home page of the service:',
		});
	}
	if (typeof options.hasScrobbler === 'undefined') {
		questions.push({
			type: 'confirm',
			name: 'hasScrobbler',
			message: 'Will the service have a scrobbler function?',
			default: false,
		});
	}
	if (typeof options.hasSync === 'undefined') {
		questions.push({
			type: 'confirm',
			name: 'hasSync',
			message: 'Will the service have a sync function?',
			default: false,
		});
	}
	if (typeof options.hasAutoSync === 'undefined') {
		questions.push({
			type: 'confirm',
			name: 'hasAutoSync',
			message: 'Will the service have an auto sync function?',
			default: false,
		});
	}

	/** @type {StreamingService} */
	const answers = await inquirer.prompt(questions);

	return {
		name: options.name || answers.name,
		id: options.id || answers.id,
		homePage: options.homePage || answers.homePage,
		hasScrobbler: options.hasScrobbler ?? answers.hasScrobbler,
		hasSync: options.hasSync ?? answers.hasSync,
		hasAutoSync: options.hasAutoSync ?? answers.hasAutoSync,
	};
};

const cli = async (/** @type {string[]} */ args) => {
	let options = /** @type {StreamingService} */ ({});

	if (args.length > 2) {
		options = parseArgsIntoOptions(args);
	}
	options = await promptForMissingOptions(options);
	if (!/^https?:\/\//.test(options.homePage)) {
		options.homePage = `https://${options.homePage}`;
	}
	if (options.hasAutoSync && !options.hasSync) {
		options.hasSync = true;
	}

	const service = {
		id: options.id,
		name: options.name,
		homePage: options.homePage,
		hostPatterns: generateHostPatterns(options.homePage),
		hasScrobbler: options.hasScrobbler,
		hasSync: options.hasSync,
		hasAutoSync: options.hasAutoSync,
	};

	const servicePath = path.resolve(servicesPath, service.id);
	fs.mkdirSync(servicePath);

	fs.writeFileSync(
		path.resolve(servicePath, `${service.id}.json`),
		prettier.format(JSON.stringify(service), {
			parser: 'json',
			useTabs: true,
		})
	);

	let apiTemplate;
	if (service.hasScrobbler && service.hasSync) {
		apiTemplate = fs.readFileSync(
			path.resolve(templatesPath, 'scrobbler-sync-template', 'ScrobblerSyncTemplateApi.ts'),
			'utf-8'
		);
	} else if (service.hasScrobbler) {
		apiTemplate = fs.readFileSync(
			path.resolve(templatesPath, 'scrobbler-template', 'ScrobblerTemplateApi.ts'),
			'utf-8'
		);
	} else if (service.hasSync) {
		apiTemplate = fs.readFileSync(
			path.resolve(templatesPath, 'sync-template', 'SyncTemplateApi.ts'),
			'utf-8'
		);
	}
	if (apiTemplate) {
		const serviceKey = generateKey(service.id);

		apiTemplate = replaceTemplate(apiTemplate, service.id, serviceKey);
		fs.writeFileSync(path.resolve(servicePath, `${serviceKey}Api.ts`), apiTemplate);

		if (service.hasScrobbler) {
			let eventsTemplate = fs.readFileSync(
				path.resolve(templatesPath, 'scrobbler-template', 'ScrobblerTemplateEvents.ts'),
				'utf-8'
			);
			eventsTemplate = replaceTemplate(eventsTemplate, service.id, serviceKey);
			fs.writeFileSync(path.resolve(servicePath, `${serviceKey}Events.ts`), eventsTemplate);

			let parserTemplate = fs.readFileSync(
				path.resolve(templatesPath, 'scrobbler-template', 'ScrobblerTemplateParser.ts'),
				'utf-8'
			);
			parserTemplate = replaceTemplate(parserTemplate, service.id, serviceKey);
			fs.writeFileSync(path.resolve(servicePath, `${serviceKey}Parser.ts`), parserTemplate);
		}
	}

	console.log('Service created with success at:', servicePath);
};

module.exports = cli;
