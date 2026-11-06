import logger from "./logger";
import type SecretStoragePersistence from "./persistence";

interface Storage {
    environment: Record<string, string>;
}

export default class DataStorage {
    private readonly storage: Storage;
    private readonly persistence: SecretStoragePersistence;

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
        logger.info(`Loaded ${Object.keys(persisted).length} persisted env var(s)`);
        return storage;
    }

    // Every browser window runs its own copy of this extension, and only the one holding the
    // port receives the injection. The others pick it up from the shared secret storage.
    public async reload(): Promise<void> {
        Object.assign(this.storage.environment, await this.persistence.loadAll());
    }

    public getEnv(key: string): string | undefined {
        return this.storage.environment[key];
    }

    public async setEnv(key: string, value: string): Promise<void> {
        this.storage.environment[key] = value;
        logger.debug(`Environment variable set: ${key}`);
        if (this.persistence) {
            await this.persistence.saveAll(this.storage.environment);
        }
    }
}
