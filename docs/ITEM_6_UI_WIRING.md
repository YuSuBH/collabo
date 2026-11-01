# Item 6: UI Wiring - Implementation Plan

## Current State Analysis

### Stop Button ❌ NOT IMPLEMENTED
- `useCodeExecution` exports `stop()` function
- `stop()` aborts the current execution via AbortController
- **Problem**: No UI component calls `stop()`
- **Required**: Add Stop button to Header or OutputHeader when `isRunning`

### Loading States ⚠️ PARTIALLY IMPLEMENTED

#### Python (Pyodide)
- `useCodeExecution` exports `pyodideLoadingState` ✅
- States: 'idle' | 'loading' | 'ready' | 'failed' ✅
- **Problem**: No UI component displays this state
- **Required**: Show loading indicator when state is 'loading'

#### JavaScript (esbuild)
- `JsRunner` has `EsbuildLoadingState` type ✅
- `RunnerRegistry.getJsRunner()` exposes the runner ✅
- **Problem**: `useCodeExecution` doesn't wire up esbuild loading state
- **Required**: Add `esbuildLoadingState` to `useCodeExecution` return

### Feature Messaging ✅ PARTIALLY IMPLEMENTED
- UnsupportedLocallyError provides clear messages ✅
- Fallback to server is logged to console ✅
- **Could improve**: Show user-facing toast/banner when fallback occurs

## Implementation Tasks

### Task 6.1: Add Stop Button
**Location**: `Header.tsx` (next to Run button) or `OutputHeader.tsx`

**Option A: Replace Run button with Stop when running** (Recommended)
```tsx
// In Header.tsx
{!canExecute ? (
  <Button ... icon={<Lock />}>No Exec Perm</Button>
) : isRunning ? (
  <Button onClick={onStop} icon={<Square />}>Stop</Button>
) : (
  <Button onClick={onExecute} icon={<Play />}>Run</Button>
)}
```

**Option B: Add separate Stop button in OutputHeader**
```tsx
// In OutputHeader.tsx
{isRunning && (
  <Button onClick={onStop} icon={<Square />} title="Stop execution" />
)}
```

**Changes Required**:
1. Add `onStop?: () => void` to Header props
2. Wire `stop()` from useCodeExecution to Header via App.tsx
3. Import `Square` icon from lucide-react

### Task 6.2: Display Python Loading State
**Location**: `Header.tsx` or `StatusBar.tsx`

**Approach**: Show loading indicator when Pyodide is downloading

```tsx
// In Header.tsx (near Run button)
{pyodideLoadingState === 'loading' && (
  <span className="py-loading-indicator">
    <Loader2 size={11} className="spin" />
    Loading Python...
  </span>
)}
```

**Changes Required**:
1. Add `pyodideLoadingState` to Header props
2. Wire state from useCodeExecution to Header via App.tsx
3. Style the loading indicator

### Task 6.3: Wire esbuild Loading State
**Location**: `hooks/useCodeExecution.ts`

**Approach**: Add esbuild state similar to pyodide

```typescript
// In useCodeExecution.ts
const [esbuildLoadingState, setEsbuildLoadingState] = useState<EsbuildLoadingState>('idle');

useEffect(() => {
  const registry = registryRef.current;
  if (!registry) return;

  const jsRunner = registry.getJsRunner();
  jsRunner.onLoadingStateChange((state) => {
    setEsbuildLoadingState(state);
  });
}, []);

// Add to return
return {
  // ... existing
  esbuildLoadingState,
};
```

Then display in Header similar to Python.

### Task 6.4: (Optional) Fallback Notification Toast
**Location**: New toast/notification component

**Approach**: Show brief toast when server fallback occurs

```tsx
// When UnsupportedLocallyError triggers fallback
{fallbackMessage && (
  <div className="fallback-toast">
    ℹ️ {fallbackMessage} — running on server
  </div>
)}
```

**Implementation**:
- Add fallback event listener in registry
- Emit event on fallback
- Display toast for 5 seconds
- NOT blocking for Item 6

## Testing Plan

### Test 6.1: Stop Button
1. Start a long-running program (Python: `time.sleep(100)`, JS: `while(true){}`)
2. Click Stop button
3. Verify execution halts
4. Verify output shows "Execution cancelled by user"

### Test 6.2: Python Loading State
1. Clear browser cache (to force Pyodide re-download)
2. Run a Python file for first time
3. Verify "Loading Python..." indicator appears
4. Verify indicator disappears when ready

### Test 6.3: esbuild Loading State
1. Clear browser cache
2. Run a JS/TS file for first time
3. Verify "Loading JavaScript bundler..." indicator appears
4. Verify indicator disappears when ready

### Test 6.4: Error Messages
1. Test import error: `import requests` in Python
2. Verify clear error message shown
3. Test syntax error in JS/Python
4. Verify compiler/runtime error shown clearly

## Status

**Implementation Priority**:
1. Task 6.1: Stop button (HIGH - user control)
2. Task 6.2: Python loading state (MEDIUM - UX clarity)
3. Task 6.3: esbuild loading state (MEDIUM - UX clarity)
4. Task 6.4: Fallback notification (LOW - nice-to-have)

**Blocking Issues**:
- None - all tasks can be implemented now
- Manual testing requires flag to be ON (or mock flag for testing)

**Estimated Effort**:
- Task 6.1: 30 minutes (stop button + wiring)
- Task 6.2: 15 minutes (display existing state)
- Task 6.3: 30 minutes (wire + display state)
- Task 6.4: 45 minutes (new toast system) — SKIP for now

**Total**: ~1.5 hours for Tasks 6.1-6.3
