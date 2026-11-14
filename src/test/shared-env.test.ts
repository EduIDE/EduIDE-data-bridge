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

    test("a window that already read a value sees a later injection", async () => {
        const secrets = sharedSecrets();
        const first = await newWindow(secrets);
        const second = await newWindow(secrets);
        await first.inject({ environment: { GIT_USER: "Ada Lovelace" } });
        await second.getEnvVars(["GIT_USER"]);

        await first.inject({ environment: { GIT_USER: "Grace Hopper" } });

        assert.deepStrictEqual(await second.getEnvVars(["GIT_USER"]), {
            GIT_USER: "Grace Hopper",
        });
    });

    test("the window holding the port keeps its values", async () => {
        const first = await newWindow(sharedSecrets());
        await first.inject({ environment: { GIT_USER: "Ada Lovelace" } });

        assert.deepStrictEqual(await first.getEnvVars(["GIT_USER", "UNSET"]), {
            GIT_USER: "Ada Lovelace",
        });
    });

    test("a read during an injection sees all of it or nothing", async () => {
        const secrets = sharedSecrets();
        let release!: () => void;
        const slowStore = new Promise<void>((resolve) => (release = resolve));
        const store = secrets.store.bind(secrets);
        secrets.store = async (key: string, value: string) => {
            await slowStore;
            await store(key, value);
        };
        const window = await newWindow(secrets);
        const keys = ["THEIA", "GIT_URI", "GIT_USER"];

        const injecting = window.inject({
            environment: { THEIA: "true", GIT_URI: "https://example.org/r.git", GIT_USER: "Ada" },
        });
        const seen = Object.keys(await window.getEnvVars(keys));
        release();
        await injecting;

        assert.ok(seen.length === 0 || seen.length === keys.length, `saw only ${seen}`);
    });
});
