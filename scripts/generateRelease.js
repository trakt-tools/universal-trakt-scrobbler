const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const path = require('path');

const { getArguments } = require(path.resolve(__dirname, './common'));
const packageJson = require(path.resolve(__dirname, '../package.json'));
const args = getArguments(process);
const octokit = new Octokit({
	auth: args.token,
	userAgent: 'universal-trakt-scrobbler',
});
const defaultParams = {
	owner: packageJson.author,
	repo: packageJson.name,
};

generateRelease();

async function generateRelease() {
	const name = `v${packageJson.version}`;
	const release = await octokit.repos.createRelease({
		...defaultParams,
		name,
		tag_name: name,
	});
	const url = release.data.upload_url;
	const files = [
		{
			content: fs.readFileSync(path.resolve(__dirname, '../dist/chrome.zip'), 'utf-8'),
			name: 'chrome.zip',
			type: 'application/zip',
		},
		{
			content: fs.readFileSync(path.resolve(__dirname, '../dist/firefox.zip'), 'utf-8'),
			name: 'firefox.zip',
			type: 'application/zip',
		},
	];
	const promises = [];
	for (const file of files) {
		promises.push(
			octokit.repos.uploadReleaseAsset({
				...defaultParams,
				release_id: release.data.id,
				data: file.content,
				name: file.name,
				url,
			})
		);
	}
}
