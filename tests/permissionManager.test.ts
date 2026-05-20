import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { API } from 'zca-js';

import { PermissionManager, Role } from '@/core/permission/PermissionManager';

let tempDir: string | undefined;

afterEach(async () => {
	if (tempDir) {
		await fsp.rm(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	}
});

async function createManager() {
	tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'alden-permission-'));
	const api = {
		getGroupInfo: vi.fn(async (threadId: string | string[]) => {
			const ids = Array.isArray(threadId) ? threadId : [threadId];
			return {
				gridInfoMap: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							creatorId: 'owner',
							adminIds: ['realDeputy'],
						},
					]),
				),
			};
		}),
	} as unknown as API;

	return {
		manager: new PermissionManager(path.join(tempDir, 'permissions.json'), ['botAdmin'], api),
		api,
	};
}

describe('PermissionManager role priority', () => {
	it('keeps group owner above virtual deputy', async () => {
		const { manager } = await createManager();
		await manager.addVirtualDeputy('group1', 'owner');

		await expect(manager.getRoleLevel('group1', 'owner', true)).resolves.toBe(Role.Leader);
	});

	it('allows virtual deputies to manage as deputies', async () => {
		const { manager } = await createManager();
		await manager.addVirtualDeputy('group1', 'virtualDeputy');

		await expect(manager.getRoleLevel('group1', 'virtualDeputy', true)).resolves.toBe(
			Role.Deputy,
		);
	});

	it('keeps BotAdmin above group roles', async () => {
		const { manager } = await createManager();
		await manager.addVirtualDeputy('group1', 'botAdmin');

		await expect(manager.getRoleLevel('group1', 'botAdmin', true)).resolves.toBe(Role.BotAdmin);
	});
});
