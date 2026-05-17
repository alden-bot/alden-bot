import type { Logger } from '@/shared/logger';
import type { PluginManifest } from './PluginManifest';

export interface PluginMeta {
	name: string;
	description: PluginManifest;
	pluginPath: string;
}

export function resolvePluginLoadOrder(metas: PluginMeta[], logger: Logger): PluginMeta[] {
	const metaMap = new Map<string, PluginMeta>();
	for (const meta of metas) {
		metaMap.set(meta.name, meta);
	}

	const failed = new Set<string>();
	for (const meta of metas) {
		for (const dep of meta.description.depend ?? []) {
			if (!metaMap.has(dep)) {
				logger.error(
					`PluginManager: "${meta.name}" requires "${dep}" which is not available. Skipping.`,
				);
				failed.add(meta.name);
			}
		}
	}

	const inDegree = new Map<string, number>();
	const adjacency = new Map<string, string[]>();

	for (const meta of metas) {
		if (failed.has(meta.name)) continue;
		inDegree.set(meta.name, 0);
		adjacency.set(meta.name, []);
	}

	for (const meta of metas) {
		if (failed.has(meta.name)) continue;

		const deps = [...(meta.description.depend ?? []), ...(meta.description.softDepend ?? [])];

		for (const dep of deps) {
			if (!metaMap.has(dep) || failed.has(dep)) continue;

			adjacency.get(dep)!.push(meta.name);
			inDegree.set(meta.name, (inDegree.get(meta.name) ?? 0) + 1);
		}
	}

	const queue: string[] = [];
	for (const [name, degree] of inDegree) {
		if (degree === 0) queue.push(name);
	}

	const result: PluginMeta[] = [];
	while (queue.length > 0) {
		const name = queue.shift()!;
		result.push(metaMap.get(name)!);

		for (const neighbor of adjacency.get(name) ?? []) {
			const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
			inDegree.set(neighbor, newDegree);
			if (newDegree === 0) queue.push(neighbor);
		}
	}

	if (result.length !== inDegree.size) {
		const loaded = new Set(result.map((meta) => meta.name));
		const cyclePlugins = [...inDegree.keys()].filter((name) => !loaded.has(name));
		logger.error(
			`PluginManager: Circular dependency detected among: ${cyclePlugins.join(', ')}. Skipping.`,
		);
	}

	return result;
}
