const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const requiredEnv = ['FIREFOX_CLIENT_ID', 'FIREFOX_CLIENT_SECRET', 'FIREFOX_EXTENSION_ID'];
const amoBaseUrl = 'https://addons.mozilla.org/api/v5';

const getRequiredEnv = (name) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
};

const base64Url = (value) =>
	Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const createJwt = () => {
	const issuedAt = Math.floor(Date.now() / 1000);
	const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const payload = base64Url(
		JSON.stringify({
			iss: getRequiredEnv('FIREFOX_CLIENT_ID'),
			jti: crypto.randomUUID(),
			iat: issuedAt,
			exp: issuedAt + 60,
		})
	);
	const signature = crypto
		.createHmac('sha256', getRequiredEnv('FIREFOX_CLIENT_SECRET'))
		.update(`${header}.${payload}`)
		.digest('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

	return `${header}.${payload}.${signature}`;
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

const request = async (url, options = {}) => {
	const response = await fetch(url, {
		...options,
		headers: {
			Authorization: `JWT ${createJwt()}`,
			...(options.headers || {}),
		},
	});
	const body = await readResponse(response);

	if (!response.ok) {
		throw new Error(
			`${options.method || 'GET'} ${url} failed with ${response.status}: ${JSON.stringify(body)}`
		);
	}

	return body;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadPackage = async (xpiPath) => {
	const xpi = fs.readFileSync(path.resolve(xpiPath));
	const formData = new FormData();
	formData.set('upload', new Blob([xpi]), path.basename(xpiPath));
	formData.set('channel', 'listed');

	console.log(`Uploading Firefox package ${xpiPath}...`);
	const response = await request(`${amoBaseUrl}/addons/upload/`, {
		method: 'POST',
		body: formData,
	});
	console.log(`Firefox upload response: ${JSON.stringify(response)}`);

	if (!response.uuid) {
		throw new Error(`Firefox upload response did not include uuid: ${JSON.stringify(response)}`);
	}

	return response.uuid;
};

const waitForValidation = async (uploadUuid) => {
	for (let attempt = 1; attempt <= 30; attempt += 1) {
		const response = await request(
			`${amoBaseUrl}/addons/upload/${encodeURIComponent(uploadUuid)}/`
		);
		console.log(`Firefox validation response: ${JSON.stringify(response)}`);

		if (response.processed) {
			if (!response.valid) {
				throw new Error(`Firefox validation failed: ${JSON.stringify(response)}`);
			}
			return;
		}

		await sleep(10000);
	}

	throw new Error(`Firefox validation did not finish for upload ${uploadUuid}`);
};

const createVersion = async (uploadUuid) => {
	const extensionId = getRequiredEnv('FIREFOX_EXTENSION_ID');
	const response = await request(
		`${amoBaseUrl}/addons/addon/${encodeURIComponent(extensionId)}/versions/`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ upload: uploadUuid }),
		}
	);
	console.log(`Firefox version response: ${JSON.stringify(response)}`);
};

const main = async () => {
	for (const name of requiredEnv) {
		getRequiredEnv(name);
	}

	const xpiPath = process.argv[2] || './dist/firefox.zip';
	const uploadUuid = await uploadPackage(xpiPath);
	await waitForValidation(uploadUuid);
	await createVersion(uploadUuid);
};

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
