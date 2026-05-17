import fsp from 'node:fs/promises';
import path from 'node:path';

import logger from '@/shared/logger';

export async function existsAsync(filePath: string): Promise<boolean> {
	try {
		await fsp.stat(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function ensureDirAsync(dirPath: string): Promise<void> {
	try {
		await fsp.mkdir(dirPath, { recursive: true });
	} catch (err: unknown) {
		if ((err as NodeJS.ErrnoException)?.code !== 'EEXIST') {
			throw err;
		}
	}
}

export async function readJsonFileAsync<T>(filePath: string): Promise<T | null> {
	let raw: string;
	try {
		raw = await fsp.readFile(filePath, 'utf-8');
	} catch (error) {
		const isEnoent =
			error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
		if (isEnoent) return null;

		logger.error(`Failed to read JSON file: ${filePath}`, error);
		throw error;
	}

	if (!raw.trim()) return null;

	try {
		return JSON.parse(raw) as T;
	} catch (error) {
		logger.error(`Invalid JSON file: ${filePath}`, error);
		throw error;
	}
}

export async function writeJsonFileAsync(filePath: string, data: unknown): Promise<void> {
	await ensureDirAsync(path.dirname(filePath));
	const tempPath = `${filePath}.tmp`;
	await fsp.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
	await fsp.rename(tempPath, filePath);
}
