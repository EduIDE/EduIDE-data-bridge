# Change Log

All notable changes to the "theia-data-bridge" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [2.0.0] - 2026-11-16

### Breaking changes

- `POST /data` requires the per-instance bearer token as `Authorization: Bearer <token>`, compared in constant time (DB-01). The token comes from `DATA_BRIDGE_TOKEN`, which the operator sets from a per-instance Secret. Without a configured or matching token the bridge rejects every write. `GET /health` stays public ([#12](https://github.com/EduIDE/EduIDE-data-bridge/pull/12))
- Only known keys are accepted (DB-02): `THEIA`, `TEMPLATE`, `GIT_URI`, `GIT_USER`, `GIT_MAIL`, `GIT_REF`, `GIT_SOURCE`, `ARTEMIS_URL`, `ARTEMIS_TOKEN`, `GRADLE_PREWARM`, `GRADLE_PREWARM_AUTO_CONFIRM` and `THEIACLOUD_SESSION_SECRET`. Other keys are ignored and the response names them. Installations that inject further keys list them in `DATA_BRIDGE_EXTRA_KEYS` ([#12](https://github.com/EduIDE/EduIDE-data-bridge/pull/12))
- An injection replaces the stored environment instead of merging into it, so repeating an injection changes nothing ([#12](https://github.com/EduIDE/EduIDE-data-bridge/pull/12))
- A schema error returns `400` instead of `401`, a body over 64 KiB returns `413`, and a failure returns a generic `500` without the internal message ([#12](https://github.com/EduIDE/EduIDE-data-bridge/pull/12))

### Fixes

- A second browser window whose bridge cannot bind the port no longer logs that the server started or leaves an unhandled error ([#12](https://github.com/EduIDE/EduIDE-data-bridge/pull/12))

### Upgrade notes

- Deploy the EduIDE-Cloud 3.0.0 operator and the EduIDE-Helm chart with the token Secret Role before IDE images that contain this release. A new operator works with the old bridge, but an old operator against this bridge fails every injection with `401`.

## [1.0.0] - 2026-11-16

First stable release, for the EduIDE 3.0 platform.

### Fixes

- An injection becomes visible all at once: a reader no longer sees the first variable before the rest are set, which made Scorpio start without `GIT_URI` and skip the clone ([#31](https://github.com/EduIDE/EduIDE-data-bridge/pull/31))

### Dependencies

- hono 4.13.18, @hono/node-server 2.1.7, arktype 2.2.9 ([#34](https://github.com/EduIDE/EduIDE-data-bridge/pull/34))
- Updated dev tooling (esbuild 0.28, @vscode/test-cli 0.0.15 and in-range updates) ([#35](https://github.com/EduIDE/EduIDE-data-bridge/pull/35))

## [0.0.17] - 2026-11-06

### Dependencies

- Bump hono and @hono/node-server and pin patched transitive dependencies via pnpm overrides to fix Dependabot security alerts ([#18](https://github.com/EduIDE/EduIDE-data-bridge/pull/18))
- Bump @hono/node-server to 2.x and move every minimatch copy between 7 and 11.0.0 to 11.0.x, fixing the remaining Dependabot alerts ([#23](https://github.com/EduIDE/EduIDE-data-bridge/pull/23))

## [0.0.16] - 2026-11-06

### Fixes

- A second browser window now receives the injected environment, even though only the first window holds the port ([#17](https://github.com/EduIDE/EduIDE-data-bridge/pull/17))
