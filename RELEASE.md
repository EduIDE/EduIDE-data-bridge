# Release Guide for Theia Data Bridge

This document describes how to release new versions of the theia-data-bridge extension using GitHub Actions.

## Overview

The release process is automated using GitHub Actions and consists of three workflows:

1. **Build & Test** (`build.yml`) - Runs on every push and PR to validate the code
2. **Package** (`package.yml`) - Builds the `.vsix` file (can be triggered manually or by release)
3. **Release** (`release.yml`) - Attaches the `.vsix` file to the GitHub release

## Release Process

### 1. Prepare for Release

Before creating a release, ensure:

- [ ] All changes are merged to `main`
- [ ] Tests are passing
- [ ] Version in `package.json` is ready (it will be updated automatically during release)
- [ ] CHANGELOG is updated (if you maintain one)

### 2. Create a GitHub Release

1. Go to your repository on GitHub
2. Click on "Releases" in the right sidebar
3. Click "Draft a new release"
4. Create a new tag following semantic versioning (e.g., `v0.1.0`, `v1.0.0`)
   - Format: `v<major>.<minor>.<patch>`
   - Example: `v0.1.0` for the first release
5. Fill in the release title and description
6. Click "Publish release"

### 3. Automated Publishing

Once you publish the release, GitHub Actions will automatically:

1. ✅ Check out the code
2. ✅ Install dependencies (using pnpm)
3. ✅ Update `package.json` version to match the tag (strips the `v` prefix)
4. ✅ Build the extension (`pnpm run build`)
5. ✅ Package the extension into a `.vsix` file (`pnpm run package`)
6. ✅ Upload the `.vsix` file as a release asset (replacing an existing one on a re-run)

The workflow does not publish to the VS Code Marketplace or Open VSX.

## Configuration

### Secrets

The release needs no secrets. It uploads the `.vsix` with the workflow's own `GITHUB_TOKEN`, which the `release` job gets with `contents: write`.

### Publishing to Open VSX (not enabled)

To publish like scorpio, which uses Open VSX trusted publishing instead of a stored token:

1. Register `EduIDE/EduIDE-data-bridge` (workflow `release.yml`, environment `prod`) as a trusted publisher for `tum-aet.data-bridge` on https://open-vsx.org
2. Add `id-token: write` to the `release` job's permissions
3. Add a step before the upload: `npx ovsx@1.3.0 publish --trusted-publishing ./data-bridge-<version>.vsix`

### Environment Protection (Recommended)

The `release` job runs in the `prod` environment. Configure it:

1. Go to Settings → Environments → New environment
2. Name: `prod`
3. Add protection rules (optional but recommended):
   - Required reviewers (require manual approval before publishing)
   - Deployment branches (only allow releases from `main`)

## Local Testing

Before creating a release, you can test the packaging locally:

```bash
# Install dependencies
pnpm install

# Build the extension
pnpm run build

# Package the extension
pnpm run package
```

This creates a `.vsix` file that you can:
- Install locally: `code --install-extension theia-data-bridge-0.0.1.vsix`
- Share with others for testing
- Manually upload to the marketplace

## Manual Installation for Testing

To install the extension on other machines for testing:

### Method 1: From GitHub Release

1. Go to the Releases page
2. Download the `.vsix` file from the latest release
3. In VS Code: Extensions → "..." menu → "Install from VSIX..."
4. Select the downloaded file

### Method 2: Build Locally and Share

```bash
# Build and package
pnpm run build && pnpm run package

# Share the generated .vsix file
# Install on target machine:
code --install-extension theia-data-bridge-X.Y.Z.vsix
```

### Method 3: Install via Command Line

```bash
# From a URL (after GitHub release)
code --install-extension https://github.com/YOUR_ORG/theia-data-bridge/releases/download/v0.1.0/theia-data-bridge-0.1.0.vsix
```

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backwards compatible
- **Patch** (0.0.X): Bug fixes, backwards compatible

Examples:
- `v0.1.0` - First release
- `v0.1.1` - Bug fix
- `v0.2.0` - New feature
- `v1.0.0` - First stable release

## Troubleshooting

### Build Fails

Check the GitHub Actions logs:
1. Go to Actions tab
2. Click on the failed workflow run
3. Expand the failed step to see the error

Common issues:
- TypeScript errors: Run `pnpm run ts:check` locally
- Linting errors: Run `pnpm run lint` locally
- Missing dependencies: Ensure `pnpm-lock.yaml` is committed

### Upload Fails

1. **Missing release**: The workflow runs on `release: released`, so the release must exist and be published (not a draft or pre-release)
2. **Asset name**: The packaged file must be `data-bridge-<version>.vsix`, matching the `name` in `package.json`

### Extension Not Working After Install

1. Check the extension logs: View → Output → Select "theia-data-bridge"
2. Verify the server started: Look for "HTTP server started" message
3. Test the server: `curl http://127.0.0.1:16281/`

## Workflow Files

### `.github/workflows/build.yml`
Runs on every push/PR. Validates code quality (type checking, linting, building).

### `.github/workflows/package.yml`
Reusable workflow that builds and packages the `.vsix` file. Can be called by other workflows.

### `.github/workflows/release.yml`
Triggered when a GitHub release is published (`release: released`, so pre-releases do not trigger it). Packages the extension and attaches the `.vsix` to the release.

## Best Practices

1. **Test Before Release**: Always test the built `.vsix` file locally before publishing
2. **Update Documentation**: Keep README.md and CHANGELOG.md up to date
3. **Use Pre-releases**: For beta versions, mark the GitHub release as "pre-release". The release workflow skips it and runs once you promote it to a full release
4. **Version Tags**: Always use `v` prefix for tags (e.g., `v1.0.0`)

## Next Steps

After setting up the release workflow:

1. Configure the `prod` environment
2. Make a test release (e.g., `v0.1.0`)
3. Verify the extension works when installed from the `.vsix` file

## Additional Resources

- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Open VSX Publishing](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [GitHub Actions](https://docs.github.com/en/actions)

