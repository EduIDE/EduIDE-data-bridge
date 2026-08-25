import logger from "./logger";
import type SecretStoragePersistence from "./persistence";

interface Storage {
    environment: Record<string, string>;
}

export default class DataStorage {
    private readonly storage: Storage;
    private readonly persistence: SecretStoragePersistence;
    private injected = false;

    private constructor(persistence: SecretStoragePersistence) {
        this.storage = {
            environment: {},
        };
        this.persistence = persistence;
    }

    public static async withPersistence(
        persistence: SecretStoragePersistence,
    ): Promise<DataStorage> {
        const storage = new DataStorage(persistence);
        const persisted = await persistence.loadAll();
        storage.storage.environment = persisted;
        // Treat restored non-empty state as already injected so that a pod/extension
        // restart does not make consumers wait for a fresh injection that will not come.
        storage.injected = Object.keys(persisted).length > 0;
        logger.info(`Loaded ${Object.keys(persisted).length} persisted env var(s)`);
        return storage;
    }

    public getEnv(key: string): string | undefined {
        return this.storage.environment[key];
    }

    public getAll(): Record<string, string> {
        return { ...this.storage.environment };
    }

    public isInjected(): boolean {
        return this.injected;
    }

    public async setEnv(key: string, value: string): Promise<void> {
        this.storage.environment[key] = value;
        logger.debug(`Environment variable set: ${key}`);
        if (this.persistence) {
            await this.persistence.saveAll(this.storage.environment);
        }
    }

    /**
     * Atomically applies a whole environment map: updates the in-memory store,
     * persists once, and only then marks the storage as injected. Marking
     * `injected` after the single persist call ensures a concurrent consumer
     * never observes `injected === true` with a partially written map.
     */
    public async setAll(env: Record<string, string>): Promise<void> {
        for (const [key, value] of Object.entries(env)) {
            this.storage.environment[key] = value;
        }
        logger.debug(`Environment variables set: ${Object.keys(env).length}`);
        if (this.persistence) {
            await this.persistence.saveAll(this.storage.environment);
        }
        this.injected = true;
    }
}
