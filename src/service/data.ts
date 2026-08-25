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
        // Apply the whole payload atomically so consumers polling getEnvState never
        // observe a "ready" state with a partially written environment map.
        await this.storage.setAll(request.environment);
    }

    public getEnvVars(request: getEnvCommandRequest): Record<string, string> {
        logger.debug(`Retrieving ${request.length} environment variable(s)`);
        return Object.fromEntries(
            request
                .map((key) => [key, this.storage.getEnv(key)])
                .filter(([_, value]) => value !== undefined),
        );
    }

    /**
     * Returns the full injected environment together with an `injected` readiness
     * flag. Consumers that do not know the variable names in advance poll this until
     * `injected` is true, then read every key from `environment`.
     */
    public getEnvState(): { injected: boolean; environment: Record<string, string> } {
        return {
            injected: this.storage.isInjected(),
            environment: this.storage.getAll(),
        };
    }
}

export default DataService;
