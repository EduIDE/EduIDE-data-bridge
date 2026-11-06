import * as assert from "assert";

import type * as vscode from "vscode";
import { createApp } from "../app.ts";
import DataService from "../service/data.ts";
import DataStorage from "../service/storage.ts";
import SecretStoragePersistence from "../service/persistence.ts";

// Minimal in-memory SecretStorage so the server can be exercised without a real
// extension context.
function inMemorySecrets(): vscode.SecretStorage {
    const data = new Map<string, string>();
    return {
        get: async (key: string) => data.get(key),
        store: async (key: string, value: string) => void data.set(key, value),
    } as unknown as vscode.SecretStorage;
}

async function newApp(): Promise<ReturnType<typeof createApp>> {
    const persistence = new SecretStoragePersistence(inMemorySecrets());
    const storage = await DataStorage.withPersistence(persistence);
    return createApp(new DataService(storage));
}

function injectRequest(headers: Record<string, string> = {}): RequestInit {
    return {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify({ environment: { ARTEMIS_TOKEN: "token-123" } }),
    };
}

suite("Data Bridge - HTTP authentication", () => {
    const TOKEN = "correct-horse-battery-staple";
    let savedToken: string | undefined;

    setup(() => {
        savedToken = process.env.THEIACLOUD_SESSION_SECRET;
    });

    teardown(() => {
        if (savedToken === undefined) {
            delete process.env.THEIACLOUD_SESSION_SECRET;
        } else {
            process.env.THEIACLOUD_SESSION_SECRET = savedToken;
        }
    });

    test("rejects POST /data without a token", async () => {
        process.env.THEIACLOUD_SESSION_SECRET = TOKEN;
        const app = await newApp();
        const res = await app.request("/data", injectRequest());
        assert.strictEqual(res.status, 401);
    });

    test("rejects POST /data with a wrong token", async () => {
        process.env.THEIACLOUD_SESSION_SECRET = TOKEN;
        const app = await newApp();
        const res = await app.request(
            "/data",
            injectRequest({ Authorization: "Bearer wrong-token" }),
        );
        assert.strictEqual(res.status, 401);
    });

    test("accepts POST /data with the correct token", async () => {
        process.env.THEIACLOUD_SESSION_SECRET = TOKEN;
        const app = await newApp();
        const res = await app.request("/data", injectRequest({ Authorization: `Bearer ${TOKEN}` }));
        assert.strictEqual(res.status, 200);
    });

    test("fails closed when THEIACLOUD_SESSION_SECRET is unset", async () => {
        delete process.env.THEIACLOUD_SESSION_SECRET;
        const app = await newApp();
        const res = await app.request("/data", injectRequest({ Authorization: `Bearer ${TOKEN}` }));
        assert.strictEqual(res.status, 401);
    });

    // A prewarmed pod starts before its session exists and gets an empty secret.
    test("fails closed when THEIACLOUD_SESSION_SECRET is empty", async () => {
        process.env.THEIACLOUD_SESSION_SECRET = "";
        const app = await newApp();
        const res = await app.request("/data", injectRequest({ Authorization: "Bearer " }));
        assert.strictEqual(res.status, 401);
    });

    test("health endpoint stays public", async () => {
        delete process.env.THEIACLOUD_SESSION_SECRET;
        const app = await newApp();
        const res = await app.request("/health");
        assert.strictEqual(res.status, 200);
    });
});
