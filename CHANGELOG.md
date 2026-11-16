# Change Log

All notable changes to the "theia-data-bridge" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
