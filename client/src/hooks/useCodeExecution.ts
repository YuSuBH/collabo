import { useState, useCallback, useEffect } from 'react';
import * as Y from 'yjs';
import {
  getWandboxCompiler,
  getExecutableLanguage,
  isBundlableWith,
  ENTRY_FILE_PRIORITY,
} from '../utils/languageDetection';
import type { UserPresence } from '../utils/collaborators';
import type { ExecutionResult, SharedExecutionRun } from '../types/execution';

export type { ExecutionResult, SharedExecutionRun };

const EXECUTE_API_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/execute';

const MAX_SHARED_RUNS = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseCodeExecutionOptions {
  doc: Y.Doc | null;
  activeFile: string;
  currentUser?: UserPresence;
}

export interface UseCodeExecutionReturn {
  run: (entryFile?: string, stdin?: string) => Promise<void>;
  isRunning: boolean;
  result: ExecutionResult | null;
  error: string | null;
  clearResult: () => void;
  /** Auto-detected or last-used entry file (may differ from activeFile) */
  resolvedEntryFile: string | null;
  /** Shared runs list across all collaborators in the room (newest first) */
  sharedRuns: SharedExecutionRun[];
  /** ID of the currently selected run to display in output */
  selectedRunId: string | null;
  /** Select a specific run (or null for current user's active result) */
  selectRun: (runId: string | null) => void;
  /** The actively displayed run object (if a peer run is selected) */
  displayedRun: SharedExecutionRun | null;
  /** Most recent run executed by another peer (for live notifications) */
  latestPeerRun: SharedExecutionRun | null;
  /** Clear latest peer run notification banner */
  clearPeerNotification: () => void;
}

// ─── Helper: auto-detect the best entry file from a list ─────────────────────

export function autoDetectEntryFile(
  fileNames: string[],
  activeFile: string
): string {
  if (fileNames.length === 0) return activeFile;

  // Get the language of the active file
  const activeLang = getExecutableLanguage(activeFile);

  // If the active file is executable, try to find a canonical entry in the same language
  if (activeLang) {
    const priorities = ENTRY_FILE_PRIORITY[activeLang] ?? [];
    for (const candidate of priorities) {
      if (fileNames.includes(candidate)) return candidate;
    }
    // Fall back to the active file itself if it's in the right language
    return activeFile;
  }

  // Active file is not executable — look for any known entry file across supported languages
  const allPriorities = Object.values(ENTRY_FILE_PRIORITY).flat();
  for (const candidate of allPriorities) {
    if (fileNames.includes(candidate)) return candidate;
  }

  // Last resort: first file in the list
  return fileNames[0];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCodeExecution({
  doc,
  activeFile,
  currentUser,
}: UseCodeExecutionOptions): UseCodeExecutionReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedEntryFile, setResolvedEntryFile] = useState<string | null>(null);
  const [sharedRuns, setSharedRuns] = useState<SharedExecutionRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [latestPeerRun, setLatestPeerRun] = useState<SharedExecutionRun | null>(null);

  // ── Sync shared-executions Y.Array ──────────────────────────────────────────
  useEffect(() => {
    if (!doc) return;

    const sharedArray = doc.getArray<SharedExecutionRun>('shared-executions');

    const updateRuns = () => {
      const runs = sharedArray.toArray();
      // Sort newest first
      const sorted = [...runs].sort((a, b) => b.timestamp - a.timestamp);
      setSharedRuns(sorted);
    };

    updateRuns();

    const handleArrayChange = (event: Y.YArrayEvent<SharedExecutionRun>) => {
      updateRuns();

      // Check if a new run was added by someone else
      event.changes.added.forEach((item) => {
        item.content.getContent().forEach((runObj: SharedExecutionRun) => {
          if (
            runObj &&
            runObj.executorId !== doc.clientID &&
            runObj.executorName !== currentUser?.name
          ) {
            setLatestPeerRun(runObj);
          }
        });
      });
    };

    sharedArray.observe(handleArrayChange);

    return () => {
      sharedArray.unobserve(handleArrayChange);
    };
  }, [doc, currentUser?.name]);

  const selectRun = useCallback((runId: string | null) => {
    setSelectedRunId(runId);
  }, []);

  const clearPeerNotification = useCallback(() => {
    setLatestPeerRun(null);
  }, []);

  // ── Run Function ────────────────────────────────────────────────────────────
  const run = useCallback(
    async (entryFileOverride?: string, stdin?: string) => {
      if (!doc) {
        setError('Editor not ready. Please wait for synchronization.');
        return;
      }

      // ── Collect all files from Yjs ──────────────────────────────────────
      const filesMap = doc.getMap<Y.Text>('files');
      const fileNames = Array.from(filesMap.keys());

      // ── Resolve entry file ──────────────────────────────────────────────
      const entryFile = entryFileOverride ?? autoDetectEntryFile(fileNames, activeFile);
      setResolvedEntryFile(entryFile);

      // ── Validate language ───────────────────────────────────────────────
      const compiler = getWandboxCompiler(entryFile);
      if (!compiler) {
        setError(
          `"${entryFile}" uses an unsupported language. Only JavaScript (.js/.jsx), TypeScript (.ts/.tsx), and Python (.py) files can be executed.`
        );
        return;
      }

      // ── Build code + codes[] ────────────────────────────────────────────
      const entryText = filesMap.get(entryFile);
      if (!entryText) {
        setError(`Entry file "${entryFile}" not found in the project.`);
        return;
      }
      const code = entryText.toString();

      const codes: { file: string; code: string }[] = [];
      for (const name of fileNames) {
        if (name === entryFile) continue;
        if (!isBundlableWith(entryFile, name)) continue;
        const text = filesMap.get(name);
        if (text) {
          codes.push({ file: name, code: text.toString() });
        }
      }

      // ── Execute ─────────────────────────────────────────────────────────
      setIsRunning(true);
      setError(null);
      setResult(null);
      setSelectedRunId(null); // Reset selection to current local run

      const startMs = Date.now();

      try {
        const res = await fetch(EXECUTE_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            compiler,
            code,
            codes: codes.length > 0 ? codes : undefined,
            stdin: stdin ?? '',
          }),
        });

        const durationMs = Date.now() - startMs;
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? `Execution failed (HTTP ${res.status})`);
          return;
        }

        const runResult: ExecutionResult = {
          stdout: data.program_output ?? '',
          stderr: data.program_error ?? '',
          compilerError: data.compiler_error ?? '',
          exitCode: data.status ?? '-1',
          durationMs,
          entryFile,
          compiler,
          stdin: stdin || undefined,
        };

        setResult(runResult);

        // ── Broadcast to shared-executions Y.Array ─────────────────────────
        const sharedRun: SharedExecutionRun = {
          ...runResult,
          id: `${doc.clientID}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          executorId: doc.clientID,
          executorName: currentUser?.name || 'Anonymous',
          executorColor: currentUser?.color || '#3b82f6',
          timestamp: Date.now(),
        };

        const sharedArray = doc.getArray<SharedExecutionRun>('shared-executions');
        doc.transact(() => {
          sharedArray.push([sharedRun]);
          while (sharedArray.length > MAX_SHARED_RUNS) {
            sharedArray.delete(0, 1);
          }
        });
      } catch (err: any) {
        setError(err?.message ?? 'Network error — could not reach the execution server.');
      } finally {
        setIsRunning(false);
      }
    },
    [doc, activeFile, currentUser]
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setSelectedRunId(null);
  }, []);

  const displayedRun = selectedRunId
    ? sharedRuns.find((r) => r.id === selectedRunId) ?? null
    : null;

  return {
    run,
    isRunning,
    result,
    error,
    clearResult,
    resolvedEntryFile,
    sharedRuns,
    selectedRunId,
    selectRun,
    displayedRun,
    latestPeerRun,
    clearPeerNotification,
  };
}
