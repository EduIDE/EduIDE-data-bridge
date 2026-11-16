import { allowedKeys, type DataInjectRequest, type getEnvCommandRequest } from "../schema.ts";
import type DataStorage from "./storage.ts";
import logger from "./logger.ts";

class DataService {
    private storage: DataStorage;

    constructor(storage: DataStorage) {
        this.storage = storage;
    }

    public async inject(request: DataInjectRequest): Promise<void> {
        const allowed = allowedKeys();
        const entries = Object.entries(request.environment);
        const environment = Object.fromEntries(entries.filter(([key]) => allowed.has(key)));
        const dropped = entries.length - Object.keys(environment).length;
        if (dropped > 0) {
            logger.warn(`Ignored ${dropped} environment variable(s) with an unknown name`);
        }
        logger.debug(`Injecting ${Object.keys(environment).length} environment variable(s)`);
        if (Object.keys(environment).length === 0) {
            return;
        }
        await this.storage.replaceEnvs(environment);
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
