import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { readJsonFileAsync } from '@/utils/file';

let tempRoot: string | undefined;

async function createTempFile(name: string, content: string): Promise<string> {
	tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'alden-file-'));
	const filePath = path.join(tempRoot, name);
	await fsp.writeFile(filePath, content);
	return filePath;
}

describe('readJsonFileAsync', () => {
	afterEach(async () => {
		if (tempRoot) {
			await fsp.rm(tempRoot, { recursive: true, force: true });
			tempRoot = undefined;
		}
	});

	it('returns null for missing files', async () => {
		const filePath = path.join(os.tmpdir(), 'alden-missing-json-file.json');

		await expect(readJsonFileAsync(filePath)).resolves.toBeNull();
	});

	it('returns null for empty files', async () => {
		const filePath = await createTempFile('empty.json', '   ');

		await expect(readJsonFileAsync(filePath)).resolves.toBeNull();
	});

	it('throws on invalid JSON', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		const filePath = await createTempFile('invalid.json', '{ invalid');

		await expect(readJsonFileAsync(filePath)).rejects.toThrow();
	});
});
