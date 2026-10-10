# Change Log

All notable changes to the "theia-data-bridge" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Require the session's own secret (`THEIACLOUD_SESSION_SECRET`, already present in every IDE pod) as an `Authorization: Bearer` token on `POST /data`, compared in constant time. The operator sends it (EduIDE-Cloud #146), so no new secret has to be wired or rotated. The server fails closed when the secret is unset.
- Stop returning internal error messages to callers; log details server-side only.
- Initial release