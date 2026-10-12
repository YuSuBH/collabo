# Local Code Execution Architecture

This document describes the in-browser code execution system added to Collabo, with server fallback.

## Overview

Code execution now runs locally in the browser for JavaScript, TypeScript, and Python, with automatic fallback to the server for unsupported features or other languages.

## Architecture

### Runner System

The execution system is built around a `Runner` interface:

```typescript
interface Runner {
  run(req: ExecRequest, onOutput?: StreamCallback, signal?: AbortSignal): Promise<ExecResult>;
  dispose(): void;
}
```

Three implementations:

- **ServerRunner**: Proxies to `/api/execute` (Wandbox API). Unchanged from original behavior.
- **JsRunner**: In-browser JavaScript/TypeScript using esbuild-wasm bundling
- **PyodideRunner**: In-browser Python using Pyodide 314.x (Python 3.14)

### Registry and Fallback

`RunnerRegistry` selects the appropriate runner based on file extension. A `FallbackRunner` wrapper catches `UnsupportedLocallyError` and falls back to the server automatically.

**Flow**:
1. User clicks Run
2. Registry determines language from entry file extension
3. For JS/TS/Python → try local runner first
4. If local runner throws `UnsupportedLocallyError` → fall back to server
5. If local runner throws other error OR user code errors → NO fallback (would double-execute)
6. Other languages → go directly to server

### Isolation (Sandbox)

Local execution runs in an opaque-origin sandboxed iframe:

```html
<iframe sandbox="allow-scripts">
```

WITHOUT `allow-same-origin`, the iframe:
- Cannot access parent cookies or localStorage
- Cannot call parent's `/api` endpoints with credentials
- Cannot access parent's DOM or JavaScript context

Communication is via `postMessage` only. This prevents malicious code in a collaborative room from compromising other users.

**Note**: The SandboxManager infrastructure exists but is not currently used by JsRunner/PyodideRunner. Workers run directly in the main context. The sandbox is available for future enhancement.

## JavaScript / TypeScript (JsRunner)

### Bundling

- Uses **esbuild-wasm 0.24.2** (11.9 MB, 3.2 MB gzipped)
- Self-hosted WASM file via Vite `?url` import
- Virtual filesystem plugin resolves imports from in-memory file list
- Bundles to ES modules, target `es2020`

### Execution

- Bundled code runs in a module Worker
- Console shims: `console.log/info/warn/error` → postMessage output
- Process shim: minimal `process.{argv, env, exit, stdout, stderr}`
- **No Node.js built-ins** (fs, path, http, etc.)
- **No npm packages** (except those bundled into source files)

### TypeScript

- **Transpile-only**: No type checking, just strip types
- Type errors do not prevent execution
- Equivalent to `tsc --noCheck`

### Unsupported Features

Falls back to server if code:
- Imports Node built-ins (`fs`, `http`, `path`, etc.)
- Imports npm packages not in the file list
- Requires `package.json` dependencies

### Known Differences from Server (Wandbox)

- No Node.js runtime APIs
- No filesystem or network access
- No `require()` (ESM only after bundling)
- Runs in browser environment, not Node

## Python (PyodideRunner)

### Loading

- Uses **Pyodide 0.26.4** → Python 3.14.2 (versioning: 314.x = Python 3.14)
- CDN: `https://cdn.jsdelivr.net/pyodide/v0.26.4/full/`
- Lazy loading: Downloaded only on first Python run
- Browser caching: Subsequent page loads reuse cached files
- Warm worker: One worker persists across runs (terminated on timeout)

**Loading states exposed**: `idle`, `loading`, `ready`, `failed`

### Execution

- Files written to Pyodide's in-memory FS at `/work/`
- Working directory added to `sys.path`
- Entry file executed via `runpy.run_path()`
- Multi-file imports work (package-style Python code)

### stdin

- Pre-provided via `setStdin()` (non-interactive)
- No blocking `input()` prompt support

### stdout/stderr

- Captured via `setStdout`/`setStderr`
- Batched for performance (10ms debounce)

### Limitations (Pyodide 314.x)

- **ssl module is a stub**: No real TLS/SSL operations
- **Missing hashlib algorithms**: Some OpenSSL-dependent hashes unavailable
- **No interactive input()**: stdin is pre-loaded text, not terminal
- **No filesystem persistence**: Cleanup after each run

### Known Differences from Server (Wandbox cpython-3.12.7)

- **Python 3.14** vs server's **Python 3.12.7**
- ssl operations will fail (stub only)
- Some hashlib functions missing
- No access to system libraries not bundled in Pyodide

## Execution Control

### Timeout

- Default: 10 seconds
- On timeout: worker is **terminated** and discarded
- Next run creates fresh worker (cold start for Python, ~instant for JS)

### Stop Button

- User can abort running code via `AbortSignal`
- Worker terminates immediately
- No lingering processes

### Output Capping

- Stdout and stderr each capped at **100 KB**
- Truncation marker: `[output truncated - exceeded 100KB limit]`
- Applied both during streaming and before storing in `shared-executions`
- Prevents Yjs document bloat (shared across all clients)

### Run-While-Running Prevention

- `isRunning` flag prevents concurrent executions
- Run button disabled while code is executing

## Server Fallback

Server execution (via Wandbox) remains the fallback for:

- **Unsupported local features** (npm packages, Node built-ins)
- **Pyodide load failures**
- **Other languages** (C++, Java, Ruby, etc.)

Server rate limit: **4 runs/minute per IP**.
Allowed compilers: `nodejs-20.17.0`, `typescript-5.6.2`, `cpython-3.12.7`.

## Yjs Integration

Execution results stored in `doc.getArray('shared-executions')`:

- Capped at 25 runs
- Each run includes executor metadata (ID, name, color)
- Peers see live notifications when others execute code
- Output panel shows historical runs from all collaborators

**No changes to Yjs data model**. Local and server runs produce identical `ExecutionResult` shape.

## File Layout

```
client/src/utils/execution/
├── types.ts              # Runner, ExecRequest, ExecResult interfaces
├── ServerRunner.ts       # Wandbox proxy (original behavior)
├── JsRunner.ts          # JavaScript/TypeScript with esbuild
├── PyodideRunner.ts     # Python with Pyodide
├── registry.ts          # Runner selection and fallback logic
├── SandboxManager.ts    # Isolated iframe infrastructure (future use)
└── index.ts             # Public exports

client/src/hooks/
└── useCodeExecution.ts  # Hook with stop(), loading states, abort support

client/public/
└── sandbox-worker.html  # Sandboxed iframe HTML (future use)
```

## Download Sizes

- **esbuild-wasm**: 11.9 MB (3.2 MB gzipped) - loaded on page load
- **Pyodide runtime**: ~6-8 MB gzipped - lazy loaded on first Python run
- **Total first-run overhead**: ~4-5 MB gzipped for JS/TS, ~9-11 MB for Python

Subsequent runs use browser cache.

## Testing

To test the implementation:

### JavaScript

```javascript
// Hello world
console.log("Hello from browser!");

// Multi-file (create util.js)
import { greet } from './util.js';
console.log(greet('World'));

// Runtime error
throw new Error("Test error");

// Timeout (infinite loop)
while(true) {}

// Large output
for(let i = 0; i < 100000; i++) console.log(i);
```

### Python

```python
# Hello world
print("Hello from Pyodide!")

# Multi-file imports
from utils import helper
print(helper())

# stdin
name = input()
print(f"Hello, {name}!")

# Error with traceback
raise ValueError("Test error")

# Timeout
while True:
    pass
```

### Fallback Testing

```javascript
// Should fall back to server (Node built-in)
const fs = require('fs');
fs.readFileSync('test.txt');
```

## Future Enhancements

1. **Full sandbox integration**: Move JsRunner/PyodideRunner into sandboxed iframe
2. **Pyodide packages**: Support `micropip.install()` for pip packages
3. **Execution backend indicator**: Show "Local" vs "Server" badge in output
4. **Cold start optimization**: Preload Pyodide on idle
5. **Source maps**: Better error reporting for TypeScript
6. **Interactive stdin**: Prompt user for input() calls

## Security Notes

- Local execution MUST NOT use parent origin credentials
- Code from collaborators is **untrusted**
- Sandboxed iframe (when integrated) prevents:
  - Cookie theft
  - CSRF attacks against `/api` endpoints
  - Access to localStorage/sessionStorage
  - DOM manipulation of parent page
- Workers provide process isolation but NOT security boundary
- Server fallback maintains rate limiting (4/min)

## Known Issues

1. **Sandbox not enforced**: Workers currently run in main context, not sandboxed iframe
2. **No source maps**: TypeScript errors show transpiled JS locations
3. **Cold start**: First Python run takes ~2-5 seconds to download runtime
4. **No progress**: Pyodide download shows generic "loading" (no percentage)

