import fsp from 'node:fs/promises';
import path from 'node:path';
import { ensureDirAsync, writeJsonFileAsync } from '@/utils/file';
import logger from '@/shared/logger';

export class ConfigProvider<T extends Record<string, unknown>> {
	private data!: T;

	public constructor(
		private readonly filePath: string,
		private readonly defaultData: T,
	) {}

	public async load(): Promise<void> {
		try {
			await ensureDirAsync(path.dirname(this.filePath));
			const raw = await fsp.readFile(this.filePath, 'utf-8');
			const parsed = JSON.parse(raw) as Partial<T>;

			this.data = { ...this.defaultData, ...parsed };
		} catch (error) {
			const isEnoent =
				error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
			if (isEnoent) {
				logger.debug(
					`ConfigProvider: File not found at ${this.filePath}, creating default.`,
				);
				this.data = { ...this.defaultData };
				await this.save();
			} else {
				logger.error(`ConfigProvider: Failed to load config from ${this.filePath}`, error);
				this.data = { ...this.defaultData };
			}
		}
	}

	public async save(): Promise<void> {
		try {
			await writeJsonFileAsync(this.filePath, this.data);
		} catch (error) {
			logger.error(`ConfigProvider: Failed to save config to ${this.filePath}`, error);
			throw error;
		}
	}

	public get<K extends keyof T>(key: K): T[K] {
		return this.data[key];
	}

	public async set<K extends keyof T>(
		key: K,
		value: T[K],
		saveImmediately = true,
	): Promise<void> {
		this.data[key] = value;
		if (saveImmediately) {
			await this.save();
		}
	}

	public getAll(): T {
		return { ...this.data };
	}
}
