import type { Logger } from '@/shared/logger';

export class ServiceRegistry {
	private readonly services = new Map<string, unknown>();

	public constructor(private readonly logger: Logger) {}

	public register<T>(name: string, service: T): void {
		if (this.services.has(name)) {
			this.logger.warn(`ServiceRegistry: "${name}" is already registered. Overwriting.`);
		}
		this.services.set(name, service);
		this.logger.debug(`ServiceRegistry: Registered "${name}"`);
	}

	public get<T>(name: string): T | undefined {
		return this.services.get(name) as T | undefined;
	}

	public unregister(name: string): void {
		if (this.services.delete(name)) {
			this.logger.debug(`ServiceRegistry: Unregistered "${name}"`);
		}
	}

	public has(name: string): boolean {
		return this.services.has(name);
	}

	public getNames(): string[] {
		return Array.from(this.services.keys());
	}
}
