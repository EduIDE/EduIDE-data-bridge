import type { DataInjectRequest, getEnvCommandRequest } from "../schema.ts";
import type DataStorage from "./storage.ts";
import logger from "./logger.ts";

class DataService {
    private storage: DataStorage;

    constructor(storage: DataStorage) {
        this.storage = storage;
    }

    public async inject(request: DataInjectRequest): Promise<void> {
        const keys = Object.keys(request.environment).length;
        logger.debug(`Injecting ${keys} environment variable(s)`);
        await this.storage.setEnvs(request.environment);
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
