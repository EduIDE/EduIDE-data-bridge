import { type } from "arktype";

// HTTP request schema for crednetial injection
export const dataInjectRequestSchema = type({
    environment: "Record<string, string>",
});

export type DataInjectRequest = typeof dataInjectRequestSchema.infer;

// Keys the operator sends and the platform extensions read: Scorpio (ENV_KEYS), the session
// monitor (THEIACLOUD_SESSION_SECRET) and the launch keys the landing page sends.
// Deployments that inject more through ConfigMaps or Secrets list them in DATA_BRIDGE_EXTRA_KEYS.
const KNOWN_KEYS = [
    "THEIA",
    "TEMPLATE",
    "GIT_URI",
    "GIT_USER",
    "GIT_MAIL",
    "ARTEMIS_URL",
    "ARTEMIS_TOKEN",
    "GRADLE_PREWARM",
    "GRADLE_PREWARM_AUTO_CONFIRM",
    "THEIACLOUD_SESSION_SECRET",
];

export function allowedKeys(): Set<string> {
    const extra = (process.env.DATA_BRIDGE_EXTRA_KEYS ?? "")
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean);
    return new Set([...KNOWN_KEYS, ...extra]);
}

// VSCode command schema for getEnv
export const getEnvSchema = type("string[]");

export type getEnvCommandRequest = typeof getEnvSchema.infer;
