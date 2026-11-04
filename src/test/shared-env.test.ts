import * as assert from "assert";
import type * as vscode from "vscode";
import DataService from "../service/data";
import SecretStoragePersistence from "../service/persistence";
import DataStorage from "../service/storage";

// Stands in for the secret storage that all windows of a session share.
function sharedSecrets(): vscode.SecretStorage {
    const data = new Map<string, string>();
    return {
        get: async (key: string) => data.get(key),
        store: async (key: string, value: string) => void data.set(key, value),
    } as unknown as vscode.SecretStorage;
}

async function newWindow(secrets: vscode.SecretStorage): Promise<DataService> {
    const persistence = new SecretStoragePersistence(secrets);
    return new DataService(await DataStorage.withPersistence(persistence));
}

suite("Environment shared across browser windows", () => {
    test("a window started before the injection sees it", async () => {
        const secrets = sharedSecrets();
        const first = await newWindow(secrets);
        const second = await newWindow(secrets);

        assert.deepStrictEqual(await second.getEnvVars(["GIT_USER"]), {});

        await first.inject({ environment: { GIT_USER: "Ada Lovelace" } });

        assert.deepStrictEqual(await second.getEnvVars(["GIT_USER"]), {
            GIT_USER: "Ada Lovelace",
        });
    });

    test("the window holding the port keeps its values", async () => {
        const first = await newWindow(sharedSecrets());
        await first.inject({ environment: { GIT_USER: "Ada Lovelace" } });

        assert.deepStrictEqual(await first.getEnvVars(["GIT_USER", "UNSET"]), {
            GIT_USER: "Ada Lovelace",
        });
    });
});
