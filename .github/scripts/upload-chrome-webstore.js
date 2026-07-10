const fs = require('node:fs');
const path = require('node:path');

const requiredEnv = [
	'CHROME_CLIENT_ID',
	'CHROME_CLIENT_SECRET',
	'CHROME_REFRESH_TOKEN',
	'CHROME_EXTENSION_ID',
	'CHROME_PUBLISHER_ID',
];

const getRequiredEnv = (name) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
};

const readResponse = async (response) => {
	const text = await response.text();
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch (_err) {
		return text;
	}
};

const request = async (url, options) => {
	const response = await fetch(url, options);
	const body = await readResponse(response);

	if (!response.ok) {
		throw new Error(
			`${options.method || 'GET'} ${url} failed with ${response.status}: ${JSON.stringify(body)}`
		);
	}

	return body;
};

const getAccessToken = async () => {
	const body = new URLSearchParams({
		client_id: getRequiredEnv('CHROME_CLIENT_ID'),
		client_secret: getRequiredEnv('CHROME_CLIENT_SECRET'),
		refresh_token: getRequiredEnv('CHROME_REFRESH_TOKEN'),
		grant_type: 'refresh_token',
	});

	const response = await request('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	});

	if (!response.access_token) {
		throw new Error(
			`Chrome token response did not include access_token: ${JSON.stringify(response)}`
		);
	}

	return response.access_token;
};

const main = async () => {
	for (const name of requiredEnv) {
		getRequiredEnv(name);
	}

	const zipPath = process.argv[2] || './dist/chrome.zip';
	const extensionId = getRequiredEnv('CHROME_EXTENSION_ID');
	const publisherId = getRequiredEnv('CHROME_PUBLISHER_ID');
	const zip = fs.readFileSync(path.resolve(zipPath));
	const token = await getAccessToken();
	const headers = {
		Authorization: `Bearer ${token}`,
	};

	console.log(`Uploading Chrome package ${zipPath}...`);
	const uploadResponse = await request(
		`https://chromewebstore.googleapis.com/upload/v2/publishers/${encodeURIComponent(
			publisherId
		)}/items/${encodeURIComponent(extensionId)}:upload`,
		{
			method: 'POST',
			headers: {
				...headers,
				'Content-Type': 'application/zip',
			},
			body: zip,
		}
	);
	console.log(`Chrome upload response: ${JSON.stringify(uploadResponse)}`);

	console.log('Publishing Chrome package...');
	const publishResponse = await request(
		`https://chromewebstore.googleapis.com/v2/publishers/${encodeURIComponent(
			publisherId
		)}/items/${encodeURIComponent(extensionId)}:publish`,
		{
			method: 'POST',
			headers,
		}
	);
	console.log(`Chrome publish response: ${JSON.stringify(publishResponse)}`);
};

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
