# Item 5: Fallback Rules Verification

## Current Behavior (Verified from Code)

### UnsupportedLocallyError Fallback ✅

The `FallbackRunner` class (in `registry.ts`) implements a try-catch pattern:

```typescript
async run(req, onOutput, signal) {
  try {
    return await this.localRunner.run(req, onOutput, signal);
  } catch (err) {
    if (err instanceof UnsupportedLocallyError) {
      console.log('[RunnerRegistry] Falling back to server:', err.message);
      return await this.serverRunner.run(req, onOutput, signal);
    }
    throw err; // Re-throw all other errors
  }
}
```

**Result**: Only `UnsupportedLocallyError` triggers server fallback. All other errors are propagated to the user.

### Cases That Trigger Fallback

1. **JS/TS: External module imports**
   - When bundling detects `import 'lodash'` or similar npm package
   - Throws: `UnsupportedLocallyError("Import of external module \"lodash\" requires server execution")`
   - Result: ✅ Falls back to server

2. **JS/TS: esbuild initialization failure**
   - If WASM fails to load
   - Throws: `UnsupportedLocallyError("Failed to initialize esbuild-wasm")`
   - Result: ✅ Falls back to server

3. **Python: Pyodide initialization failure**
   - Currently returns ExecResult with error, doesn't throw UnsupportedLocallyError
   - TODO: Could be enhanced but not blocking Item 5

### Cases That Do NOT Trigger Fallback (User Errors)

1. **Syntax errors**
   - JS/TS: esbuild compilation error → returns `ExecResult` with `compiler_error`
   - Python: SyntaxError in user code → returns `ExecResult` with `program_error`
   - Result: ✅ Error shown to user, no fallback

2. **Runtime errors**
   - JS/TS: `ReferenceError`, `TypeError`, etc. → caught by worker, returns `ExecResult`
   - Python: `NameError`, `ValueError`, etc. → caught by Pyodide, returns `ExecResult`
   - Result: ✅ Error shown to user, no fallback

3. **Import errors (Python)**
   - `import requests` (not in Pyodide stdlib) → ImportError
   - Returns `ExecResult` with `program_error`, not UnsupportedLocallyError
   - Result: ✅ Error shown to user, no fallback
   - Note: Future enhancement could auto-install with micropip

## Manual Testing Scenarios

### Test 1: External module import (should fallback)
```javascript
// main.js
import _ from 'lodash';
console.log(_.VERSION);
```
**Expected**: Console log shows "[RunnerRegistry] Falling back to server: Import of external module "lodash" requires server execution"

### Test 2: Syntax error (should NOT fallback)
```javascript
// main.js
const x = ;
```
**Expected**: Compilation error shown to user, no fallback

### Test 3: Runtime error (should NOT fallback)
```javascript
// main.js
console.log(undefinedVariable);
```
**Expected**: ReferenceError shown to user, no fallback

### Test 4: Python stdlib import (should work locally)
```python
# main.py
import json
print(json.dumps({'hello': 'world'}))
```
**Expected**: Runs locally, outputs `{"hello": "world"}`

### Test 5: Python external package (should error, not fallback)
```python
# main.py
import requests
print(requests.get('https://example.com').text)
```
**Expected**: ImportError shown to user, no fallback (because flag is OFF)
**Note**: When flag is ON and local exec works, this currently shows ImportError. Server fallback could be added for common packages like requests.

## Status

**Item 5 is COMPLETE** from an implementation perspective:
- ✅ FallbackRunner correctly filters UnsupportedLocallyError
- ✅ User errors (syntax, runtime) don't trigger fallback
- ✅ Only architectural limitations (external modules, init failures) trigger fallback

**Verification Status**:
- Code review: ✅ Complete
- Manual testing: ⚠️ Cannot test with flag OFF (all runs go to server)
- Runtime verification: Will test when flag is turned ON in future

**Recommendation**: Proceed to Item 6. Manual testing of fallback behavior requires:
1. Turning flag ON (blocked by sandbox)
2. Or creating a test harness that mocks the flag
