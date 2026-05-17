import { validateEnv } from '@/config/env';
import { AuthManager } from '@/core/auth/AuthManager';
import { BotListener } from '@/core/BotListener';
import { AldenBot } from '@/core/AldenBot';
import { PATH } from '@/config/constants';
import { ensureDirAsync, readJsonFileAsync } from '@/utils/file';
import logger, { Logger } from '@/shared/logger';

validateEnv();
console.clear();

Logger.enableFileOutput(PATH.LOGS_DIR);

await ensureDirAsync(PATH.DATA_DIR);
await ensureDirAsync(PATH.LOGIN_DIR);
await ensureDirAsync(PATH.PLUGINS_DIR);

function printBanner(version: string): void {
	const width = process.stdout.columns || 80;
	const labelWidth = Math.max(16, Math.floor(width / Math.PI));

	console.log(`
    _    _     _
   / \\  | | __| | ___ _ __
  / _ \\ | |/ _\` |/ _ \\ '_ \\
 / ___ \\| | (_| |  __/ | | |
/_/   \\_\\_|\\__,_|\\___|_| |_|

${'version'.padEnd(labelWidth, '.')}: ${version}
${'by'.padEnd(labelWidth, '.')}: finntrannn (github: finntrannn | finn.id.vn)
`);
}

const startBot = async (): Promise<void> => {
	const pkg = await readJsonFileAsync<{ version: string }>(PATH.PACKAGE_JSON);
	const version = pkg?.version ?? 'unknown';

	printBanner(version);

	try {
		const authManager = new AuthManager(PATH);
		const api = await authManager.login();
		const { profile } = await api.fetchAccountInfo();
		logger.info(`Logged in as: ${profile.zaloName} (${profile.userId})`);

		const bot = new AldenBot(api);
		await bot.initialize(version);

		await bot.pluginManager.loadAll(PATH.PLUGINS_DIR);
		await bot.pluginManager.enableAll();

		const listener = new BotListener(bot);
		listener.start();

		let shuttingDown = false;
		const handleShutdown = async () => {
			if (shuttingDown) return;
			shuttingDown = true;

			logger.info('Shutting down bot...');
			bot.schedulerManager.stop();
			bot.permissionManager.stopCacheCleanup();
			bot.commandManager.stopCooldownCleanup();
			await bot.pluginManager.unloadAll();

			const text = 'IT IS SAFE NOW TO EXIT THIS PROGRAM';
			const columns = process.stdout.columns || 80;
			const leftPadding = Math.floor((columns - text.length) / 2);
			const centeredText = text.padStart(text.length + leftPadding, '.').padEnd(columns, '.');

			console.log('\n\n');
			console.log(centeredText);
			console.log('\n\n');

			await Logger.flush();
			process.exit(0);
		};

		process.on('SIGINT', handleShutdown);
		process.on('SIGTERM', handleShutdown);
	} catch (error) {
		logger.error('Failed to start bot', error);
		await Logger.flush();
		process.exit(1);
	}
};

startBot();
