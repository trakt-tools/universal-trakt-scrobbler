const { getInput, setFailed } = require('@actions/core');
const { getOctokit } = require('@actions/github');
const fs = require('fs');
const path = require('path');
const packageJson = require('../../../package.json');

const defaultParams = {
	owner: packageJson.author,
	repo: packageJson.name,
};

const deployBeta = async () => {
	const octokit = getOctokit(getInput('trakt-tools-bot-token'), {
		userAgent: 'universal-trakt-scrobbler',
	});

	console.log('Deleting previous beta release...');

	const releases = await octokit.rest.repos.listReleases({
		...defaultParams,
	});

	const previousRelease = releases.data.find((release) => release.prerelease);
	if (previousRelease) {
		await octokit.rest.repos.deleteRelease({
			...defaultParams,
			release_id: previousRelease.id,
		});
	}

	console.log('Generating release...');

	const name = `Beta (${new Date().toISOString()})`;

	const release = await octokit.rest.repos.createRelease({
		...defaultParams,
		name,
		tag_name: 'beta',
		prerelease: true,
	});

	const distPath = path.resolve(__dirname, '../../../dist');
	const files = [
		{
			content: fs.readFileSync(path.resolve(distPath, 'chrome.zip')),
			name: 'chrome.zip',
			type: 'application/zip',
		},
		{
			content: fs.readFileSync(path.resolve(distPath, 'firefox.zip')),
			name: 'firefox.zip',
			type: 'application/zip',
		},
	];

	console.log('Uploading assets...');

	const promises = [];
	for (const file of files) {
		promises.push(
			octokit.rest.repos.uploadReleaseAsset({
				...defaultParams,
				release_id: release.data.id,
				name: file.name,
				data: file.content,
				url: release.data.upload_url,
			})
		);
	}
	await Promise.all(promises);
};

const main = async () => {
	try {
		await deployBeta();
	} catch (err) {
		setFailed(err.message);
	}
};

void main();
