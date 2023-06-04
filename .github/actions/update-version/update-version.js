const { getInput, setFailed } = require('@actions/core');
const fs = require('fs');
const path = require('path');
const packageJson = require('../../../package.json');

const updateVersion = async () => {
	const versionType = getInput('version-type');

	console.log(`Updating ${versionType} version...`);

	let [major, minor, patch] = packageJson.version.split('.').map((v) => Number.parseInt(v));
	switch (versionType) {
		case 'major':
			major += 1;
			minor = 0;
			patch = 0;
			break;

		case 'minor':
			minor += 1;
			patch = 0;
			break;

		case 'patch':
			patch += 1;
			break;
	}
	packageJson.version = [major, minor, patch].join('.');

	const packageJsonPath = path.resolve(__dirname, '../../../package.json');
	const packageJsonStr = JSON.stringify(packageJson, null, 2);
	fs.writeFileSync(packageJsonPath, packageJsonStr);
};

const main = async () => {
	try {
		await updateVersion();
	} catch (err) {
		setFailed(err.message);
	}
};

void main();
