const { getInput, setFailed } = require('@actions/core');
const { context, getOctokit } = require('@actions/github');
const packageJson = require('../../../package.json');

const defaultParams = {
	owner: packageJson.author,
	repo: packageJson.name,
};

const CROWDIN_BASE_URL = 'https://api.crowdin.com/api/v2';

/**
 * @param {string} endpoint
 * @param {object} [options]
 * @returns {Promise<any>}
 */
const crowdinFetch = async (endpoint, options = {}) => {
	const url = new URL(CROWDIN_BASE_URL + endpoint);
	if (options.params) {
		for (const [key, value] of Object.entries(options.params)) {
			url.searchParams.set(key, String(value));
		}
	}

	const response = await fetch(url, {
		method: options.method || 'GET',
		headers: {
			Authorization: `Bearer ${getInput('crowdin-api-key')}`,
			'Content-Type': 'application/json',
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		const error = new Error(`Crowdin API error: ${response.status} ${response.statusText}`);
		error.response = { data: errorData };
		throw error;
	}

	return response.json();
};

/**
 * @typedef {Object} IssuePayload
 * @property {Object} issue
 * @property {number} issue.number
 * @property {string} issue.title
 */

/**
 * @template T
 * @typedef {Object} CrowdinData
 * @property {T} data
 */

/**
 * @typedef {Object} CrowdinLanguage
 * @property {string} id
 * @property {string} name
 * @property {string} osxLocale
 */

/**
 * @typedef {Object} CrowdinProject
 * @property {string[]} targetLanguageIds
 */

/**
 * @see https://developer.chrome.com/docs/webstore/i18n/#choosing-locales-to-support
 */
const supportedLanguages = [
	'ar',
	'am',
	'bg',
	'bn',
	'ca',
	'cs',
	'da',
	'de',
	'el',
	'en',
	'en_GB',
	'en_US',
	'es',
	'es_419',
	'et',
	'fa',
	'fi',
	'fil',
	'fr',
	'gu',
	'he',
	'hi',
	'hr',
	'hu',
	'id',
	'it',
	'ja',
	'kn',
	'ko',
	'lt',
	'lv',
	'ml',
	'mr',
	'ms',
	'nl',
	'no',
	'pl',
	'pt_BR',
	'pt_PT',
	'ro',
	'ru',
	'sk',
	'sl',
	'sr',
	'sv',
	'sw',
	'ta',
	'te',
	'th',
	'tr',
	'uk',
	'vi',
	'zh_CN',
	'zh_TW',
];

/** @type {Record<string, string>} */
const languagesMappings = {
	pt: 'pt_PT',
	'zh-Hans': 'zh_CN',
	'zh-Hant': 'zh_TW',
};

/**
 * @param {string} query
 * @returns {Promise<CrowdinLanguage[]>}
 */
const getLanguages = async (query) => {
	const response = await crowdinFetch('/languages', {
		params: { limit: 500 },
	});
	const languages = /** @type {CrowdinData<CrowdinData<CrowdinLanguage>[]>} */ (response);

	const languagesMatches = languages.data
		.filter(
			(language) =>
				language.data.name.toLowerCase().includes(query) &&
				supportedLanguages.includes(
					languagesMappings[language.data.osxLocale] || language.data.osxLocale
				)
		)
		.map((language) => ({
			...language.data,
			isExactMatch: language.data.name.toLowerCase() === query,
		}));

	return languagesMatches;
};

const addLanguage = async () => {
	const payload = /** @type {IssuePayload} */ (context.payload);
	const matches = /^add\snew\slanguage:\s(")?(.+?)(")?$/.exec(
		payload.issue.title.trim().toLowerCase()
	);

	if (matches) {
		const octokit = getOctokit(getInput('trakt-tools-bot-token'), {
			userAgent: 'universal-trakt-scrobbler',
		});
		const [, isExactMatch, query] = matches;

		console.log(`Getting languages for query: ${query}`);

		const languages = await getLanguages(query);

		if (languages.length === 0) {
			await octokit.rest.issues.createComment({
				...defaultParams,
				issue_number: payload.issue.number,
				body: 'Language not found. Please make sure that the name is correct and in English.',
			});

			return;
		}

		let language;

		if (languages.length > 1) {
			const exactMatch = languages.find((currentLanguage) => currentLanguage.isExactMatch);

			if (exactMatch) {
				if (isExactMatch) {
					language = exactMatch;
				} else {
					await octokit.rest.issues.createComment({
						...defaultParams,
						issue_number: payload.issue.number,
						body: `Found more than 1 languages with this name. Please edit the title and specify one of the languages below:\n\n${languages
							.map((currentLanguage) => `* ${currentLanguage.name}`)
							.join('\n')}\n\nIf you want to add the language ${
							exactMatch.name
						}, surround it with double quotes: "${exactMatch.name}"`,
					});

					return;
				}
			}

			if (!language) {
				await octokit.rest.issues.createComment({
					...defaultParams,
					issue_number: payload.issue.number,
					body: `Found more than 1 languages with this name. Please edit the title and specify one of the languages below:\n\n${languages
						.map((currentLanguage) => `* ${currentLanguage.name}`)
						.join('\n')}`,
				});

				return;
			}
		}

		if (!language) {
			[language] = languages;
		}

		console.log('Getting project');

		const projectUrl = `/projects/${getInput('crowdin-project-id')}`;
		const projectResponse = await crowdinFetch(projectUrl);
		const project = /** @type {CrowdinData<CrowdinProject>} */ (projectResponse);

		if (project.data.targetLanguageIds.includes(language.id)) {
			console.log('Creating comment');

			await octokit.rest.issues.createComment({
				...defaultParams,
				issue_number: payload.issue.number,
				body: `Language already exists: https://crowdin.com/project/universal-trakt-scrobbler/${language.id}`,
			});

			console.log('Closing issue');

			await octokit.rest.issues.update({
				...defaultParams,
				issue_number: payload.issue.number,
				state: 'closed',
			});

			return;
		}

		console.log('Adding language on Crowdin');

		/** @type {unknown[]} */
		const data = [
			{
				path: '/targetLanguageIds',
				op: 'replace',
				value: [...project.data.targetLanguageIds, language.id],
			},
		];

		if (languagesMappings[language.osxLocale]) {
			data.push({
				path: `/languageMapping/${language.id}`,
				op: 'add',
				value: { osx_locale: languagesMappings[language.osxLocale] },
			});
		}

		await crowdinFetch(projectUrl, { method: 'PATCH', body: data });

		console.log('Creating comment');

		await octokit.rest.issues.createComment({
			...defaultParams,
			issue_number: payload.issue.number,
			body: `Language added! Go to https://crowdin.com/project/universal-trakt-scrobbler/${language.id} to translate the messages.`,
		});

		console.log('Closing issue');

		await octokit.rest.issues.update({
			...defaultParams,
			issue_number: payload.issue.number,
			state: 'closed',
		});
	}
};

const main = async () => {
	try {
		await addLanguage();
	} catch (err) {
		let message = err.message;

		if (err.response?.data) {
			message += ` ${JSON.stringify(err.response.data)}`;
		}

		setFailed(message);
	}
};

void main();
