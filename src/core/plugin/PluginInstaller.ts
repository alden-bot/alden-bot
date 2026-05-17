import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { existsAsync, readJsonFileAsync, writeJsonFileAsync } from '@/utils/file';
import type { Logger } from '@/shared/logger';

const execFileAsync = promisify(execFile);
const INSTALL_TIMEOUT_MS = 120_000;

interface PluginPackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

interface InstallCommand {
	command: string;
	args: string[];
	label: string;
}

export class PluginInstaller {
	public constructor(private readonly logger: Logger) {}

	public async installIfNeeded(pluginPath: string, pluginName: string): Promise<boolean> {
		const packageJsonPath = path.join(pluginPath, 'package.json');
		if (!(await existsAsync(packageJsonPath))) return true;

		let packageJson: PluginPackageJson | null;
		try {
			packageJson = await readJsonFileAsync<PluginPackageJson>(packageJsonPath);
		} catch (error) {
			this.logger.error(
				`PluginManager: Invalid package.json for "${pluginName}". Skipping.`,
				error,
			);
			return false;
		}
		if (!this.hasDependencies(packageJson)) return true;

		const hashPath = path.join(pluginPath, '.install-hash');
		const nodeModulesPath = path.join(pluginPath, 'node_modules');
		const currentHash = await this.hashFile(packageJsonPath);

		if (await existsAsync(nodeModulesPath)) {
			let storedHash: string | null = null;
			try {
				storedHash = await readJsonFileAsync<string>(hashPath);
			} catch (error) {
				this.logger.warn(
					`PluginManager: Failed to read install hash for "${pluginName}", reinstalling...`,
					error,
				);
			}
			if (storedHash === currentHash) return true;

			this.logger.info(
				`PluginManager: package.json changed for "${pluginName}", reinstalling...`,
			);
		}

		const installCommand = await this.detectInstallCommand(pluginPath);
		this.logger.info(
			`PluginManager: Installing dependencies for "${pluginName}" (${installCommand.label})...`,
		);

		try {
			const { stderr } = await execFileAsync(installCommand.command, installCommand.args, {
				cwd: pluginPath,
				timeout: INSTALL_TIMEOUT_MS,
			});

			if (stderr?.trim()) {
				this.logger.debug(`PluginManager: [${pluginName}] ${stderr.trim()}`);
			}

			await writeJsonFileAsync(hashPath, currentHash);
			this.logger.info(`PluginManager: Dependencies installed for "${pluginName}"`);
			return true;
		} catch (error) {
			this.logger.error(
				`PluginManager: Failed to install dependencies for "${pluginName}". Skipping plugin.`,
				error,
			);
			return false;
		}
	}

	private hasDependencies(packageJson: PluginPackageJson | null): boolean {
		const dependencies = packageJson?.dependencies;
		const devDependencies = packageJson?.devDependencies;

		return Boolean(
			(dependencies && Object.keys(dependencies).length > 0) ||
			(devDependencies && Object.keys(devDependencies).length > 0),
		);
	}

	private async hashFile(filePath: string): Promise<string> {
		const content = await fsp.readFile(filePath, 'utf-8');
		return createHash('sha256').update(content).digest('hex');
	}

	private async detectInstallCommand(pluginPath: string): Promise<InstallCommand> {
		if (await existsAsync(path.join(pluginPath, 'pnpm-lock.yaml'))) {
			return {
				command: 'pnpm',
				args: ['install', '--prod', '--frozen-lockfile'],
				label: 'pnpm frozen lockfile',
			};
		}
		if (await existsAsync(path.join(pluginPath, 'yarn.lock'))) {
			return {
				command: 'yarn',
				args: ['install', '--production', '--frozen-lockfile'],
				label: 'yarn frozen lockfile',
			};
		}
		if (await existsAsync(path.join(pluginPath, 'package-lock.json'))) {
			return {
				command: 'npm',
				args: ['ci', '--omit=dev'],
				label: 'npm clean install',
			};
		}
		return {
			command: 'npm',
			args: ['install', '--production'],
			label: 'npm install',
		};
	}
}
