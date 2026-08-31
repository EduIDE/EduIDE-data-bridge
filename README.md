# Theia Data Bridge

The theia creential bridge is a VSCode extension allowing injecting and retrieving data. The injection is done via HTTP requests
from the VSCode host and the retrieval is handled using VSCode commands.

## Architecture

### CredDataential Injection

The extension exposes a lean HTTP server running on `0.0.0.0:16281`.

It offers an endpoint `POST /data` to inject data.

It will store those data in memory and offer them to other extensions via VSCode commands.

### Data Retrieval

The extension exposes a set of VSCode commands to handle retrieval of data.

- `dataBridge.getEnv`
    - Takes a list of environment variable names
    - Returns a dictionary of the requested stored environment variables
- `dataBridge.getEnvState`
    - Takes no arguments
    - Returns `{ injected: boolean, environment: Record<string, string> }`, where `environment` is the full stored map and `injected` is `true` once at least one `POST /data` injection has been applied. Consumers that do not know the variable names in advance poll this until `injected` is `true`, then read every key. Injection is applied atomically, so a `true` `injected` flag always accompanies a complete map.

### Data Storage

The extension will store the data in memory.

## Development

### Logging

The extension uses a centralized logger service (`src/service/logger.ts`) with an output channel for logging.

**Usage:**

```typescript
import logger from "./service/logger";

// Log levels
logger.debug("Detailed debugging info");      // Only shown if log level is DEBUG
logger.info("General information");           // Default level
logger.warn("Warning message");               // Warnings
logger.error("Error occurred", error);        // Errors with stack traces

// View logs
// Method 1: Command Palette → "Data Bridge: Show Logs"
// Method 2: View → Output → Select "Data Bridge" from dropdown
```

**Configuration:**

Set the log level in VS Code settings:

```json
{
  "dataBridge.logLevel": "DEBUG"  // Options: DEBUG, INFO, WARN, ERROR
}
```

**Guidelines:**
- Use `logger.debug()` for detailed tracing (e.g., command args, iteration details)
- Use `logger.info()` for important state changes (e.g., server started, data injected)
- Use `logger.warn()` for recoverable issues (e.g., 404s, validation warnings)
- Use `logger.error()` for failures (e.g., server errors, exceptions)
- Never use `showInformationMessage()` for routine operations—reserve for critical user notifications only

### Testing

```bash
pnpm run test
```

`vscode-test` downloads and launches a real VS Code instance, so the tests need a display. On a
headless machine (including CI) run them under `xvfb-run -a pnpm run test`.

The `pretest` hook compiles the sources with `tsconfig.test.json`, which is the only place emit is
configured: the main `tsconfig.json` is type-check only, so the test build overrides it to emit
CommonJS into `out/`. `.vscode-test.mjs` then picks up `out/test/**/*.test.js`.

### Dependency updates

Renovate keeps dependencies current. `renovate.json` extends the org-wide preset in
[`EduIDE/.github`](https://github.com/EduIDE/.github), so repo-local config stays minimal.
