import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { validator } from "hono/validator";
import { dataInjectRequestSchema } from "./schema.ts";
import { type } from "arktype";
import type DataService from "./service/data.ts";
import { serve, type ServerType } from "@hono/node-server";
import { timingSafeEqual } from "node:crypto";
import logger from "./service/logger.ts";

const DEFAULT_PORT = 16281;

// Name of the env var holding the shared secret the server requires on every
// state-changing request. This is the session's own secret, already present in
// the IDE pod as THEIACLOUD_SESSION_SECRET; the operator sends the same value as
// `Authorization: Bearer <sessionSecret>` (EduIDE-Cloud #146). Using it means no
// separate token to wire or rotate. If it is unset the server fails closed
// (rejects all such requests) rather than defaulting to no authentication.
const AUTH_TOKEN_ENV = "THEIACLOUD_SESSION_SECRET";

function getExpectedToken(): string | undefined {
    const token = process.env[AUTH_TOKEN_ENV];
    return token && token.length > 0 ? token : undefined;
}

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
    if (!authorizationHeader) {
        return undefined;
    }
    const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
    return match ? match[1] : undefined;
}

// Constant-time comparison with a length guard so we never leak token length or
// content through timing. timingSafeEqual throws on length mismatch, so bail out
// early when the lengths differ.
function tokensMatch(presented: string, expected: string): boolean {
    const presentedBytes = Buffer.from(presented);
    const expectedBytes = Buffer.from(expected);
    if (presentedBytes.length !== expectedBytes.length) {
        return false;
    }
    return timingSafeEqual(presentedBytes, expectedBytes);
}

// Guards state-changing endpoints with the shared secret. The pod network is
// flat, so any pod can reach this server; the token is what keeps a session's
// env/secrets from being overwritten by another pod. Fails closed when the
// expected token is not configured.
const requireAuth: MiddlewareHandler = async (c, next) => {
    const expected = getExpectedToken();
    if (!expected) {
        logger.warn(
            `Rejecting ${c.req.method} ${c.req.path}: ${AUTH_TOKEN_ENV} is not set, failing closed`,
        );
        return c.json({ error: "Unauthorized" }, 401);
    }

    const presented = extractBearerToken(c.req.header("Authorization"));
    if (!presented || !tokensMatch(presented, expected)) {
        logger.warn(`Rejecting unauthorized ${c.req.method} ${c.req.path}`);
        return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
};

export function createApp(dataService: DataService) {
    const app = new Hono();

    // Request logging middleware
    app.use("*", async (c, next) => {
        const start = Date.now();
        await next();
        const duration = Date.now() - start;
        logger.debug(`${c.req.method} ${c.req.path} ${c.res.status} (${duration}ms)`);
    });

    // Data injection endpoint. Authentication runs before validation so that an
    // unauthenticated caller can never probe the schema. A schema failure is a
    // bad request (400), distinct from an authentication failure (401).
    app.post(
        "/data",
        requireAuth,
        validator("json", (value, c) => {
            const parsed = dataInjectRequestSchema(value);
            if (parsed instanceof type.errors) {
                return c.json(
                    {
                        error: parsed.summary,
                    },
                    400,
                );
            }
            return parsed;
        }),
        async (c) => {
            const body = c.req.valid("json");
            const response = await dataService.inject(body);
            return c.json(response);
        },
    );

    // Health endpoint
    // Can be used as a measure of readiness for the extensions environment
    app.get("/health", (c) => {
        return c.text("OK", 200);
    });

    // 404 handler
    app.notFound((c) => {
        logger.warn(`404 - Not found: ${c.req.path}`);
        return c.json(
            {
                error: "Not found",
                path: c.req.path,
            },
            404,
        );
    });

    // Error handler. Details are logged server-side only; the caller gets a
    // generic message so we never leak internals (e.g. err.message) over the wire.
    app.onError((err, c) => {
        logger.error("Internal server error", err);
        return c.json(
            {
                error: "Internal server error",
            },
            500,
        );
    });

    return app;
}

function getPort(): number {
    const portFromEnv = process.env.DATA_BRIDGE_PORT;
    if (portFromEnv) {
        const parsedPortFromEnv = parseInt(portFromEnv);
        // validate the port to be a valid port number
        if (isNaN(parsedPortFromEnv) || parsedPortFromEnv < 1 || parsedPortFromEnv > 65535) {
            return DEFAULT_PORT;
        }
        return parsedPortFromEnv;
    }
    return DEFAULT_PORT;
}

export function startServer(dataService: DataService): ServerType | undefined {
    try {
        const app = createApp(dataService);
        // Bound to 0.0.0.0 because the injection caller (the platform/operator)
        // reaches this server from another pod over the flat pod network. The
        // shared secret is the access control; a NetworkPolicy restricting who
        // may reach this port is still required as defence in depth.
        const hostname = "0.0.0.0";
        const port = getPort();

        if (!getExpectedToken()) {
            logger.warn(
                `${AUTH_TOKEN_ENV} is not set: the server will reject every /data request (failing closed). Set ${AUTH_TOKEN_ENV} to enable injection.`,
            );
        }
        const server = serve({
            ...app,
            port,
            hostname,
        });

        logger.info(`HTTP server started on http://${hostname}:${port}`);

        return server;
    } catch (error) {
        logger.error("Failed to start server", error);
        return undefined;
    }
}
