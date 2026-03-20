import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const params = new URLSearchParams(window.location.search);
const userCode = params.get('code') ?? '';
const verificationUri = params.get('uri') ?? 'https://account.service-kp.com/device';

const App = () => {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	const copyCode = async () => {
		try {
			await navigator.clipboard.writeText(userCode);
			setCopied(true);
		} catch {
			// Clipboard write failed — user can copy manually from the displayed code
		}
	};

	return (
		<div
			style={{
				padding: '32px 24px',
				fontFamily: 'sans-serif',
				textAlign: 'center',
				maxWidth: '480px',
				margin: '0 auto',
			}}
		>
			<h2 style={{ marginTop: 0 }}>Kino.pub Login Required</h2>
			<p>{'Open the page below and enter the code to authorize the extension:'}</p>
			<p>
				<a href={verificationUri} target="_blank" rel="noreferrer">
					{verificationUri}
				</a>
			</p>
			<div
				style={{
					margin: '24px auto',
					padding: '16px',
					background: '#f5f5f5',
					borderRadius: '8px',
					fontSize: '2.5em',
					fontWeight: 'bold',
					letterSpacing: '12px',
					fontFamily: 'monospace',
					display: 'inline-block',
				}}
			>
				{userCode}
			</div>
			<div>
				<button
					onClick={() => void copyCode()}
					style={{
						padding: '8px 20px',
						fontSize: '1em',
						cursor: 'pointer',
						borderRadius: '4px',
						border: '1px solid #ccc',
					}}
				>
					{copied ? 'Copied!' : 'Copy Code'}
				</button>
			</div>
			<p style={{ marginTop: '24px', color: '#888', fontSize: '0.85em' }}>
				{'This page will close automatically once authentication completes.'}
			</p>
		</div>
	);
};

const root = document.querySelector('#root');
if (root) {
	createRoot(root).render(<App />);
}
