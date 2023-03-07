const { getInput, setFailed } = require('@actions/core');
const { getOctokit } = require('@actions/github');
const fs = require('fs');
const path = require('path');
const packageJson = require('../../../package.json');

const defaultParams = {
	owner: packageJson.author,
	repo: packageJson.name,
};

const deployStable = async () => {
	const octokit = getOctokit(getInput('trakt-tools-bot-token'), {
		userAgent: 'universal-trakt-scrobbler',
	});

	console.log('Generating release...');

	const name = `v${packageJson.version}`;

	const release = await octokit.rest.repos.createRelease({
		...defaultParams,
		name,
		tag_name: packageJson.version,
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

	console.log('Publishing release...');

	await octokit.rest.repos.updateRelease({
		...defaultParams,
		release_id: release.data.id,
		draft: false,
	});
};

const main = async () => {
	try {
		await deployStable();
	} catch (err) {
		setFailed(err.message);
	}
};

void main();
