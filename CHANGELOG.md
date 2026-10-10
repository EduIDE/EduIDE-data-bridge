# Change Log

All notable changes to the "theia-data-bridge" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- A second browser window now receives the injected environment, even though only the first window holds the port
- Initial release
- Bump hono and @hono/node-server and pin patched transitive dependencies via pnpm overrides to fix Dependabot security alerts
- Bump @hono/node-server to 2.x and move every minimatch copy between 7 and 11.0.0 to 11.0.x, fixing the remaining Dependabot alerts
- Require the session's own secret (`THEIACLOUD_SESSION_SECRET`, already present in every IDE pod) as an `Authorization: Bearer` token on `POST /data`, compared in constant time. The server fails closed when the secret is unset. Needs an operator that sends the header (EduIDE-Cloud, see README).
- Stop returning internal error messages to callers; log details server-side only.
