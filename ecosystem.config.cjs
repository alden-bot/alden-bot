module.exports = {
	apps: [
		{
			name: 'alden-bot',
			script: 'npm',
			args: 'start',
			interpreter: 'none',
			autorestart: true,
			max_memory_restart: '512M',
			env: {
				NODE_ENV: 'production',
			},
		},
	],
};
