import * as assert from "assert";

import type * as vscode from "vscode";
import * as net from "net";
import { createApp, startServer } from "../app.ts";
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

async function newService(): Promise<DataService> {
    const persistence = new SecretStoragePersistence(inMemorySecrets());
    return new DataService(await DataStorage.withPersistence(persistence));
}

async function newApp(): Promise<ReturnType<typeof createApp>> {
    return createApp(await newService());
}

function injectRequest(
    headers: Record<string, string> = {},
    body: unknown = undefined,
): RequestInit {
    return {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify(body ?? { environment: { ARTEMIS_TOKEN: "token-123" } }),
    };
}

suite("Data Bridge - HTTP authentication", () => {
    const TOKEN = "correct-horse-battery-staple";
    let savedToken: string | undefined;

    setup(() => {
        savedToken = process.env.DATA_BRIDGE_TOKEN;
    });

    teardown(() => {
        if (savedToken === undefined) {
            delete process.env.DATA_BRIDGE_TOKEN;
        } else {
            process.env.DATA_BRIDGE_TOKEN = savedToken;
        }
    });

    test("rejects POST /data without a token", async () => {
        process.env.DATA_BRIDGE_TOKEN = TOKEN;
        const app = await newApp();
        const res = await app.request("/data", injectRequest());
        assert.strictEqual(res.status, 401);
    });

    test("rejects POST /data with a wrong token", async () => {
        process.env.DATA_BRIDGE_TOKEN = TOKEN;
        const app = await newApp();
        const res = await app.request(
            "/data",
            injectRequest({ Authorization: "Bearer wrong-token" }),
        );
        assert.strictEqual(res.status, 401);
    });

    test("rejects a wrong token of the same length", async () => {
        process.env.DATA_BRIDGE_TOKEN = TOKEN;
        const app = await newApp();
        const wrong = "x".repeat(TOKEN.length);
        const res = await app.request("/data", injectRequest({ Authorization: `Bearer ${wrong}` }));
        assert.strictEqual(res.status, 401);
    });

    test("rejects a scheme other than Bearer", async () => {
        process.env.DATA_BRIDGE_TOKEN = TOKEN;
        const app = await newApp();
        for (const header of [`Basic ${TOKEN}`, TOKEN, `Token ${TOKEN}`]) {
            const res = await app.request("/data", injectRequest({ Authorization: header }));
            assert.strictEqual(res.status, 401, header);
        }
    });

    test("accepts POST /data with the correct token", async () => {
        process.env.DATA_BRIDGE_TOKEN = TOKEN;
        const app = await newApp();
        const res = await app.request("/data", injectRequest({ Authorization: `Bearer ${TOKEN}` }));
        assert.strictEqual(res.status, 200);
    });

    test("fails closed when DATA_BRIDGE_TOKEN is unset", async () => {
        delete process.env.DATA_BRIDGE_TOKEN;
        const app = await newApp();
        const res = await app.request("/data", injectRequest({ Authorization: `Bearer ${TOKEN}` }));
        assert.strictEqual(res.status, 401);
    });

    // An instance whose token Secret could not be written gets no token.
    test("fails closed when DATA_BRIDGE_TOKEN is empty", async () => {
        process.env.DATA_BRIDGE_TOKEN = "";
        const app = await newApp();
        const res = await app.request("/data", injectRequest({ Authorization: "Bearer " }));
        assert.strictEqual(res.status, 401);
    });

    test("does not accept the session secret instead of the token", async () => {
        process.env.DATA_BRIDGE_TOKEN = TOKEN;
        process.env.THEIACLOUD_SESSION_SECRET = "session-secret";
        try {
            const app = await newApp();
            const res = await app.request(
                "/data",
                injectRequest({ Authorization: "Bearer session-secret" }),
            );
            assert.strictEqual(res.status, 401);
        } finally {
            delete process.env.THEIACLOUD_SESSION_SECRET;
        }
    });

    test("health endpoint stays public", async () => {
        delete process.env.DATA_BRIDGE_TOKEN;
        const app = await newApp();
        const res = await app.request("/health");
        assert.strictEqual(res.status, 200);
    });
});

suite("Data Bridge - request handling", () => {
    const TOKEN = "correct-horse-battery-staple";
    const auth = { Authorization: `Bearer ${TOKEN}` };
    let savedToken: string | undefined;

    setup(() => {
        savedToken = process.env.DATA_BRIDGE_TOKEN;
        process.env.DATA_BRIDGE_TOKEN = TOKEN;
    });

    teardown(() => {
        delete process.env.DATA_BRIDGE_EXTRA_KEYS;
        if (savedToken === undefined) {
            delete process.env.DATA_BRIDGE_TOKEN;
        } else {
            process.env.DATA_BRIDGE_TOKEN = savedToken;
        }
    });

    test("a schema error is a 400, and an unauthenticated one is still a 401", async () => {
        const app = await newApp();
        const bad = injectRequest(auth, { environment: { GIT_USER: 1 } });
        assert.strictEqual((await app.request("/data", bad)).status, 400);
        assert.strictEqual(
            (await app.request("/data", injectRequest({}, { nope: 1 }))).status,
            401,
        );
    });

    test("rejects a body over the size limit", async () => {
        const app = await newApp();
        const big = injectRequest(auth, { environment: { GIT_USER: "x".repeat(70 * 1024) } });
        assert.strictEqual((await app.request("/data", big)).status, 413);
    });

    test("stores known keys only", async () => {
        const service = await newService();
        const app = createApp(service);
        const res = await app.request(
            "/data",
            injectRequest(auth, { environment: { GIT_USER: "Ada", EVIL: "x" } }),
        );
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(await service.getEnvVars(["GIT_USER", "EVIL"]), { GIT_USER: "Ada" });
    });

    test("answers with the names of the keys it did not store", async () => {
        const app = await newApp();
        const res = await app.request(
            "/data",
            injectRequest(auth, { environment: { GIT_REF: "main", EVIL: "x", OTHER: "y" } }),
        );
        assert.deepStrictEqual(await res.json(), { ignored: ["EVIL", "OTHER"] });
    });

    test("stores keys listed in DATA_BRIDGE_EXTRA_KEYS", async () => {
        process.env.DATA_BRIDGE_EXTRA_KEYS = "COURSE_ID, OTHER";
        const service = await newService();
        await service.inject({ environment: { COURSE_ID: "42", EVIL: "x" } });
        assert.deepStrictEqual(await service.getEnvVars(["COURSE_ID", "EVIL"]), {
            COURSE_ID: "42",
        });
    });

    test("an injection replaces the stored environment, and repeating it changes nothing", async () => {
        const service = await newService();
        await service.inject({
            environment: { GIT_URI: "https://example.org/a.git", GIT_USER: "Ada" },
        });
        const second = { environment: { GIT_URI: "https://example.org/b.git" } };
        await service.inject(second);
        await service.inject(second);
        assert.deepStrictEqual(await service.getEnvVars(["GIT_URI", "GIT_USER"]), {
            GIT_URI: "https://example.org/b.git",
        });
    });

    test("an injection of unknown keys only still clears the earlier environment", async () => {
        const service = await newService();
        await service.inject({ environment: { GIT_USER: "Ada" } });
        await service.inject({ environment: { EVIL: "x" } });
        assert.deepStrictEqual(await service.getEnvVars(["GIT_USER", "EVIL"]), {});
    });

    test("an internal error does not leak its message", async () => {
        const service = await newService();
        service.inject = async () => {
            throw new Error("secret internal detail");
        };
        const res = await createApp(service).request("/data", injectRequest(auth));
        assert.strictEqual(res.status, 500);
        assert.ok(!(await res.text()).includes("secret internal detail"));
    });

    test("a second server on a taken port does not crash", async () => {
        const blocker = net.createServer();
        await new Promise<void>((resolve) => blocker.listen(0, "0.0.0.0", resolve));
        const port = (blocker.address() as net.AddressInfo).port;
        process.env.DATA_BRIDGE_PORT = String(port);
        try {
            const server = startServer(await newService());
            await new Promise((resolve) => setTimeout(resolve, 100));
            assert.ok(server);
            server.close();
        } finally {
            delete process.env.DATA_BRIDGE_PORT;
            blocker.close();
        }
    });
});
