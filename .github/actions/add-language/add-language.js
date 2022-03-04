const { getInput, setFailed } = require('@actions/core');
const { context, getOctokit } = require('@actions/github');
const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('../../../package.json');

const defaultParams = {
	owner: packageJson.author,
	repo: packageJson.name,
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
 * @param {AxiosInstance} api
 * @param {string} query
 * @returns {Promise<CrowdinLanguage[]}
 */
const getLanguages = async (api, query) => {
	const response = await api.get('/languages', {
		params: {
			limit: 500,
		},
	});
	const languages = /** @type {CrowdinData<CrowdinData<CrowdinLanguage>[]>} */ (response.data);

	const languagesMatches = languages.data
		.filter(
			(language) =>
				language.data.name.toLowerCase().includes(query) &&
				supportedLanguages.includes(
					languagesMappings[language.data.osxLocale] || language.data.osxLocale
				)
		)
		.map((language) => language.data);

	return languagesMatches;
};

const addLanguage = async () => {
	const payload = /** @type {IssuePayload} */ (context.payload);
	const matches = /^add\snew\slanguage:\s(.+)$/.exec(payload.issue.title.trim().toLowerCase());

	if (matches) {
		const octokit = getOctokit(getInput('trakt-tools-bot-token'), {
			userAgent: 'universal-trakt-scrobbler',
		});
		const api = axios.create({
			baseURL: 'https://api.crowdin.com/api/v2/',
			headers: {
				Authorization: `Bearer ${getInput('crowdin-api-key')}`,
			},
		});
		const [, query] = matches;

		console.log('Getting languages');

		const languages = await getLanguages(api, query);

		if (languages.length === 0) {
			await octokit.rest.issues.createComment({
				...defaultParams,
				issue_number: payload.issue.number,
				body: 'Language not found. Please make sure that the name is correct and in English.',
			});

			return;
		}

		if (languages.length > 1) {
			await octokit.rest.issues.createComment({
				...defaultParams,
				issue_number: payload.issue.number,
				body: `Found more than 1 languages with this name. Please edit the title and specify one of the languages below:\n\n${languages
					.map((currentLanguage) => `* ${currentLanguage.name}`)
					.join('\n')}`,
			});

			return;
		}

		const [language] = languages;

		console.log('Getting project');

		const projectUrl = `/projects/${getInput('crowdin-project-id')}`;
		const projectResponse = await api.get(projectUrl);
		const project = /** @type {CrowdinData<CrowdinProject>} */ (projectResponse.data);

		if (project.data.targetLanguageIds.includes(language.id)) {
			await octokit.rest.issues.createComment({
				...defaultParams,
				issue_number: payload.issue.number,
				body: `Language already exists: https://crowdin.com/project/universal-trakt-scrobbler/${language.id}`,
			});
			await octokit.rest.issues.update({
				...defaultParams,
				issue_number: payload.issue.number,
				state: 'closed',
			});

			return;
		}

		const localesPath = path.resolve(__dirname, '../../../src/_locales');
		const localePath = path.resolve(localesPath, language.id);
		fs.mkdirSync(localePath);
		fs.copyFileSync(
			path.resolve(localesPath, 'en', 'messages.json'),
			path.resolve(localePath, 'messages.json')
		);

		const branchName = `new-language-${language.id}`;
		const commitName = `Add new language: ${language.name}`;

		console.log('Performing git commands');

		execSync('git config --global user.email "trakt.tools.bot@gmail.com"');
		execSync('git config --global user.name "trakt-tools-bot"');
		execSync(`git checkout -B ${branchName}`);
		execSync('git add .');
		execSync(`git commit -m "${commitName}"`);
		execSync(`git push -u origin ${branchName}`);

		console.log('Creating PR');

		await octokit.rest.pulls.create({
			...defaultParams,
			base: 'master',
			head: branchName,
			title: commitName,
			body: `Fixes #${payload.issue.number}`,
		});

		console.log('Creating comment');

		await octokit.rest.issues.createComment({
			...defaultParams,
			issue_number: payload.issue.number,
			body: `The language is being added. Once it's done, go to https://crowdin.com/project/universal-trakt-scrobbler/${language.id} to translate the messages.`,
		});

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
				path: `/languageMapping/${language.id}/osx_locale`,
				op: 'replace',
				value: languagesMappings[language.osxLocale],
			});
		}

		await api.patch(projectUrl, data);
	}
};

const main = async () => {
	try {
		await addLanguage();
	} catch (err) {
		setFailed(err.message);
	}
};

void main();
