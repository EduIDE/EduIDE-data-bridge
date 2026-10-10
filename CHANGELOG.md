# Change Log

All notable changes to the "theia-data-bridge" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Require a shared secret (`DATA_BRIDGE_AUTH_TOKEN`) as an `Authorization: Bearer` token on `POST /data`, compared in constant time. The server fails closed when the token is unset.
- Stop returning internal error messages to callers; log details server-side only.
- Initial release