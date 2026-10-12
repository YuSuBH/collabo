/**
 * Runner registry that selects the appropriate execution backend
 * based on file type and capabilities.
 */

import type { Runner, ExecRequest } from './types';
import { ServerRunner } from './ServerRunner';
import { JsRunner, UnsupportedLocallyError } from './JsRunner';
import { PyodideRunner } from './PyodideRunner';

type Language = 'javascript' | 'typescript' | 'python' | 'other';

/**
 * Returns the language category for a given entry file.
 */
function getLanguageFromEntry(entry: string): Language {
  const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase();
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
  if (['.ts', '.tsx', '.mts', '.cts'].includes(ext)) return 'typescript';
  if (ext === '.py') return 'python';
  return 'other';
}

/**
 * Wrapper runner that tries local execution and falls back to server.
 */
class FallbackRunner implements Runner {
  private localRunner: Runner;
  private serverRunner: Runner;

  constructor(localRunner: Runner, serverRunner: Runner) {
    this.localRunner = localRunner;
    this.serverRunner = serverRunner;
  }

  async run(
    req: ExecRequest,
    onOutput?: (chunk: { stream: 'out' | 'err'; text: string }) => void,
    signal?: AbortSignal
  ) {
    try {
      return await this.localRunner.run(req, onOutput, signal);
    } catch (err) {
      if (err instanceof UnsupportedLocallyError) {
        console.log('[RunnerRegistry] Falling back to server:', err.message);
        return await this.serverRunner.run(req, onOutput, signal);
      }
      throw err;
    }
  }

  dispose(): void {
    this.localRunner.dispose();
    this.serverRunner.dispose();
  }
}

/**
 * Runner registry that manages execution backends.
 * Phase 4: JS/TS run locally with JsRunner, Python with PyodideRunner.
 * All have server fallback for unsupported features.
 */
export class RunnerRegistry {
  private serverRunner: ServerRunner;
  private jsRunner: JsRunner;
  private pyodideRunner: PyodideRunner;
  private jsFallbackRunner: FallbackRunner;
  private pyFallbackRunner: FallbackRunner;

  constructor() {
    this.serverRunner = new ServerRunner();
    this.jsRunner = new JsRunner();
    this.pyodideRunner = new PyodideRunner();
    this.jsFallbackRunner = new FallbackRunner(this.jsRunner, this.serverRunner);
    this.pyFallbackRunner = new FallbackRunner(this.pyodideRunner, this.serverRunner);
  }

  /**
   * Get the appropriate runner for a given entry file.
   */
  getRunner(entry: string): Runner {
    const lang = getLanguageFromEntry(entry);
    
    // JavaScript and TypeScript: try local first, fall back to server
    if (lang === 'javascript' || lang === 'typescript') {
      return this.jsFallbackRunner;
    }
    
    // Python: try Pyodide first, fall back to server
    if (lang === 'python') {
      return this.pyFallbackRunner;
    }
    
    // Other languages: go to server
    return this.serverRunner;
  }

  /**
   * Get the PyodideRunner for loading state management.
   */
  getPyodideRunner(): PyodideRunner {
    return this.pyodideRunner;
  }

  /**
   * Clean up all runners.
   */
  dispose(): void {
    this.serverRunner.dispose();
    this.jsRunner.dispose();
    this.pyodideRunner.dispose();
  }
}
