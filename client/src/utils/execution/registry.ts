/**
 * Runner registry that selects the appropriate execution backend
 * based on file type and capabilities.
 */

import type { Runner } from './types';
import { ServerRunner } from './ServerRunner';

type Language = 'javascript' | 'typescript' | 'python' | 'other';

/**
 * Returns the language category for a given entry file.
 * Will be used in later phases when local runners are added.
 */
function getLanguageFromEntry(entry: string): Language {
  const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase();
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
  if (['.ts', '.tsx', '.mts', '.cts'].includes(ext)) return 'typescript';
  if (ext === '.py') return 'python';
  return 'other';
}

/**
 * Runner registry that manages execution backends.
 * In Phase 1, all executions go through ServerRunner.
 * Later phases will add local runners for JS/TS/Python.
 */
export class RunnerRegistry {
  private serverRunner: ServerRunner;

  constructor() {
    this.serverRunner = new ServerRunner();
  }

  /**
   * Get the appropriate runner for a given entry file.
   * Currently returns ServerRunner for all languages.
   */
  getRunner(_entry: string): Runner {
    // const lang = getLanguageFromEntry(entry); // Will be used in Phase 3+
    // Phase 1: All executions go through server
    // Later phases will add:
    // - JsRunner for javascript/typescript (getLanguageFromEntry === 'javascript'/'typescript')
    // - PyodideRunner for python (getLanguageFromEntry === 'python')
    return this.serverRunner;
  }

  /**
   * Clean up all runners.
   */
  dispose(): void {
    this.serverRunner.dispose();
  }
}

// Keep function for future use but mark as export to avoid unused warning
export { getLanguageFromEntry };
