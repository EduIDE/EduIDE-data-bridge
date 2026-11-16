import { allowedKeys, type DataInjectRequest, type getEnvCommandRequest } from "../schema.ts";
import type DataStorage from "./storage.ts";
import logger from "./logger.ts";

class DataService {
    private storage: DataStorage;

    constructor(storage: DataStorage) {
        this.storage = storage;
    }

    // Returns the names (never the values) of the keys that were not stored.
    public async inject(request: DataInjectRequest): Promise<{ ignored: string[] }> {
        const allowed = allowedKeys();
        const entries = Object.entries(request.environment);
        const environment = Object.fromEntries(entries.filter(([key]) => allowed.has(key)));
        const ignored = entries.map(([key]) => key).filter((key) => !allowed.has(key));
        if (ignored.length > 0) {
            logger.warn(`Ignored ${ignored.length} environment variable(s) with an unknown name`);
        }
        logger.debug(`Injecting ${Object.keys(environment).length} environment variable(s)`);
        // An empty request is a no-op. A request with only unknown keys still replaces the store,
        // so values of an earlier injection never outlive a newer one.
        if (entries.length > 0) {
            await this.storage.replaceEnvs(environment);
        }
        return { ignored };
    }

    public async getEnvVars(request: getEnvCommandRequest): Promise<Record<string, string>> {
        logger.debug(`Retrieving ${request.length} environment variable(s)`);
        await this.storage.reload();
        return Object.fromEntries(
            request
                .map((key) => [key, this.storage.getEnv(key)])
                .filter(([_, value]) => value !== undefined),
        );
    }
}

export default DataService;
