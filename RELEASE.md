# Release Guide for Theia Data Bridge

Releases are manual and run by `.github/workflows/release.yml`. Nothing releases on push to `main` or when a GitHub release is created by hand (a release created that way would not run any workflow). Ask Claude to "release data-bridge" (skill `.claude/skills/release`) or do it by hand.

## Release Process

1. Open a release pull request that moves the `## [Unreleased]` entries of `CHANGELOG.md` under `## [X.Y.Z] - YYYY-MM-DD`. The CHANGELOG section becomes the GitHub release notes.
2. After it is merged, run `gh workflow run release.yml -R EduIDE/EduIDE-data-bridge --ref main -f version=X.Y.Z`.
3. The workflow drafts the GitHub Release, packages the extension (`pnpm run build`, `pnpm run package`, version stamped from the input), attaches `data-bridge-X.Y.Z.vsix`, verifies it and publishes the release, which creates tag `vX.Y.Z`. A failed run leaves a draft and no tag; use "Re-run failed jobs".

A release candidate (`-rc.N`, for example `0.0.18-rc.1`) can be dispatched from any branch and creates a GitHub prerelease.

The extension is not published to the VS Code Marketplace or Open VSX. EduIDE installs it from the release asset URL: after a release, bump `theiaPlugins.data-bridge` in EduIDE (`images/base-ide/package.json.patch`).

## Workflow Files

- `build.yml` runs on every push and pull request (type check, lint, build, tests).
- `package.yml` builds the `.vsix`. It runs on pull requests and pushes to `main`, and `release.yml` calls it with the version.
- `release.yml` is the manual release. It calls the shared `EduIDE/.github` release workflow for validation and the draft GitHub Release, and `release-publish.yml` to publish it at the end.

## Local Testing

```bash
pnpm install
pnpm run build
pnpm run package
```

This creates a `.vsix` file you can install with `code --install-extension data-bridge-X.Y.Z.vsix`.

## Version Numbering

Follow [Semantic Versioning](https://semver.org/): major for breaking changes, minor for new features, patch for fixes. Tags are `vX.Y.Z`.
