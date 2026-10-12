# Sandbox Isolation Analysis

## Current State

**Status**: NOT IMPLEMENTED
**Security Risk**: HIGH - Code from collaborators runs on app's own origin with full access to cookies, localStorage, and `/api` endpoints.

## Requirements

1. Run user code in `<iframe sandbox="allow-scripts">` WITHOUT `allow-same-origin`
2. Code must have opaque origin - cannot access parent cookies/storage/API
3. esbuild-wasm and Pyodide must work from inside sandboxed iframe
4. Communication only via postMessage with validation

## Technical Challenges

### Challenge 1: Opaque Origin Restrictions

An iframe with `sandbox="allow-scripts"` but no `allow-same-origin` creates an opaque origin. This has several restrictions:

1. **Blob URL Workers**: Creating workers from `blob:` URLs fails from opaque origins (security restriction)
2. **Module Workers**: May require CORS headers that opaque origins cannot satisfy
3. **WASM Loading**: esbuild.wasm and Pyodide runtime files need CORS headers
4. **CDN Access**: External resources (jsdelivr CDN for Pyodide) work IF they send proper CORS headers

### Challenge 2: esbuild-wasm in Sandbox

esbuild-wasm requires:
- Loading 11.9 MB .wasm file
- Creating workers for compilation
- Access to `import.meta.url` for resolving wasm path

From opaque origin:
- Cannot use blob URLs for workers
- Must use data: URLs or inline workers (size limits)
- WASM must be served with CORS headers

### Challenge 3: Pyodide in Sandbox

Pyodide requires:
- Loading ~6-8 MB of runtime files from CDN
- Creating module workers (`{ type: 'module' }`)
- Dynamic imports of pyodide.mjs

From opaque origin:
- jsdelivr CDN DOES send CORS headers (`Access-Control-Allow-Origin: *`)
- Module workers CAN be created with inline code
- BUT: Cannot use blob: URLs

## Potential Solutions

### Solution A: Inline Module Workers with Data URLs (Attempted)

**Approach**: Create workers using inline code in data: URLs or inline scripts
**Pros**: No blob: URLs needed
**Cons**: 
- Data URL size limits (~2MB in some browsers)
- esbuild-wasm is 11.9 MB
- Cannot feasibly inline all code

**Verdict**: NOT FEASIBLE for esbuild due to size

### Solution B: Serve Sandbox from Subdomain

**Approach**: Serve sandbox iframe from `sandbox.collabo.app` with proper headers
**Pros**: 
- Different origin, can use blob URLs
- Full control over headers
- Workers work normally

**Cons**:
- Requires DNS setup
- Requires separate deployment
- Adds infrastructure complexity

**Verdict**: FEASIBLE but requires infrastructure changes outside code scope

### Solution C: Use Service Worker as Proxy

**Approach**: Service worker intercepts requests, serves resources with CORS headers
**Pros**: Works on same origin
**Cons**:
- Complex setup
- Service workers don't run in opaque-origin iframes
- Chicken-and-egg problem

**Verdict**: NOT FEASIBLE

### Solution D: Limit to Python Only (Pyodide works)

**Approach**: 
- Enforce sandbox only for Python (Pyodide CDN has CORS)
- JavaScript/TypeScript fall back to server only
- Python in sandbox with CDN-loaded Pyodide

**Pros**:
- Pyodide CDN already has CORS headers
- Module workers can be created inline
- Partial security improvement

**Cons**:
- JS/TS remain server-only (no local execution benefit)
- Incomplete solution

**Verdict**: PARTIALLY FEASIBLE

### Solution E: Post-MVP - Separate Sandbox Service

**Approach**: Future enhancement with proper infrastructure
**Requirements**:
1. Deploy sandbox HTML to different origin (subdomain or separate domain)
2. Set up CORS headers on that origin
3. Serve esbuild.wasm and static resources from there
4. Parent communicates via postMessage

**Verdict**: CORRECT SOLUTION but requires deployment infrastructure

## Implemented Test

Created test program to verify isolation requirements:

```python
# test_sandbox_isolation.py
import sys
print("Python version:", sys.version)

# These should all fail or return nothing from opaque origin:
# 1. Cannot access document.cookie (no document in worker)
# 2. Cannot access localStorage (no window in worker)
# 3. Cannot fetch to parent origin with credentials

# Test: attempt to access parent resources
# (Will be blocked by CORS/opaque origin)
try:
    # This is what we're protecting against
    import js
    result = js.fetch('/api/execute', {'credentials': 'include'})
    print("SECURITY FAIL: Accessed parent API")
except:
    print("SECURITY PASS: Cannot access parent API")
```

```javascript
// test_sandbox_isolation.js
console.log("Testing sandbox isolation...");

// Worker context - no document/window
try {
  console.log("Cookie:", document.cookie);
  console.log("SECURITY FAIL: Accessed cookies");
} catch (e) {
  console.log("SECURITY PASS: No document in worker");
}

// Try to fetch parent API
fetch('/api/execute', { credentials: 'include' })
  .then(r => console.log("SECURITY FAIL: Fetched parent API"))
  .catch(e => console.log("SECURITY PASS: CORS blocked", e));
```

## Recommendation

**FOR THIS ITERATION**:
1. Keep feature flag OFF by default (already done in Item 0)
2. Document security risk clearly
3. Server-only execution remains safe
4. Local execution is opt-in with known risks

**FOR PRODUCTION**:
1. Implement Solution B (subdomain) or Solution E (separate service)
2. Requires infrastructure work outside code scope
3. Do NOT enable local execution flag until sandbox is enforced

## Security Implications of Current Code

With `VITE_LOCAL_EXEC=false` (default):
- ✅ SAFE: All execution goes to server
- ✅ Collaborator code cannot access app origin
- ✅ Rate limiting applies (4 runs/minute)

With `VITE_LOCAL_EXEC=true`:
- ⚠️ UNSAFE: Workers run on app's own origin
- ⚠️ Collaborator code CAN access cookies
- ⚠️ Collaborator code CAN call `/api` endpoints
- ⚠️ No rate limiting on local runs

## Conclusion

**Sandbox enforcement is NOT IMPLEMENTED** due to technical constraints that require infrastructure changes (separate origin with proper CORS headers).

The feature flag (default OFF) provides the safety net. Local execution should NOT be enabled in production multi-user environments until sandbox isolation is properly implemented with separate origin infrastructure.

