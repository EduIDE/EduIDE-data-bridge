import * as assert from "assert";

import * as vscode from "vscode";
import DataService from "../service/data";
import DataStorage from "../service/storage";
import SecretStoragePersistence from "../service/persistence";

// Minimal in-memory SecretStorage so the storage layer can be exercised without
// a real extension context.
class InMemorySecretStorage implements vscode.SecretStorage {
    private data = new Map<string, string>();
    private emitter = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>();
    public readonly onDidChange = this.emitter.event;

    async get(key: string): Promise<string | undefined> {
        return this.data.get(key);
    }
    async store(key: string, value: string): Promise<void> {
        this.data.set(key, value);
        this.emitter.fire({ key });
    }
    async delete(key: string): Promise<void> {
        this.data.delete(key);
        this.emitter.fire({ key });
    }
    async keys(): Promise<string[]> {
        return [...this.data.keys()];
    }
}

async function newService(): Promise<DataService> {
    const persistence = new SecretStoragePersistence(new InMemorySecretStorage());
    const storage = await DataStorage.withPersistence(persistence);
    return new DataService(storage);
}

suite("Data Bridge - arbitrary env injection", () => {
    test("getEnvState reports not-injected before any injection", async () => {
        const service = await newService();
        const state = service.getEnvState();
        assert.strictEqual(state.injected, false);
        assert.deepStrictEqual(state.environment, {});
    });

    test("inject stores arbitrary keys and getEnvState returns them all as ready", async () => {
        const service = await newService();
        await service.inject({
            environment: {
                THEIA: "true",
                ARTEMIS_TOKEN: "token-123",
                MY_VAR: "hello",
            },
        });

        const state = service.getEnvState();
        assert.strictEqual(state.injected, true);
        assert.deepStrictEqual(state.environment, {
            THEIA: "true",
            ARTEMIS_TOKEN: "token-123",
            MY_VAR: "hello",
        });
    });

    test("getEnv still returns only the requested keys", async () => {
        const service = await newService();
        await service.inject({ environment: { A: "1", B: "2", C: "3" } });
        assert.deepStrictEqual(service.getEnvVars(["A", "C", "MISSING"]), {
            A: "1",
            C: "3",
        });
    });
});
