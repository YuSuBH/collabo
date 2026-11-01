/**
 * Runner registry that selects the appropriate execution backend
 * based on file type and capabilities.
 * 
 * IMPORTANT: JsRunner and PyodideRunner are lazy-loaded via dynamic imports
 * to avoid including them in the bundle when LOCAL_EXEC_ENABLED is false.
 */

import type { Runner, ExecRequest } from './types';
import { ServerRunner } from './ServerRunner';

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
      // Check if error is UnsupportedLocallyError by name since we can't import the class
      if (err instanceof Error && err.name === 'UnsupportedLocallyError') {
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
 * Feature flag for local execution.
 * Default OFF for security - local runners currently execute on the app's own origin,
 * allowing collaborator code to access this app's cookies and API endpoints.
 * Only turn this on after sandbox isolation (item 2) is verified.
 */
const LOCAL_EXEC_ENABLED = import.meta.env.VITE_LOCAL_EXEC === 'true';

/**
 * Runner registry that manages execution backends.
 * 
 * OPTIMIZATION: JsRunner and PyodideRunner are lazy-loaded on demand to avoid
 * bundling 1.8MB of unused code when LOCAL_EXEC_ENABLED is false (default).
 * 
 * SECURITY: Local execution is gated by VITE_LOCAL_EXEC flag (default off).
 */
export class RunnerRegistry {
  private serverRunner: ServerRunner;
  private jsRunner: Runner | null = null;
  private pyodideRunner: Runner | null = null;
  private jsFallbackRunner: Runner | null = null;
  private pyFallbackRunner: Runner | null = null;

  constructor() {
    this.serverRunner = new ServerRunner();
    // Local runners are NOT instantiated here - they're lazy-loaded on demand
  }

  /**
   * Lazy-load JsRunner only when needed (flag ON + JS/TS file).
   */
  private async ensureJsRunner(): Promise<Runner> {
    if (!this.jsRunner) {
      const { JsRunner } = await import('./JsRunner');
      this.jsRunner = new JsRunner();
    }
    return this.jsRunner;
  }

  /**
   * Lazy-load PyodideRunner only when needed (flag ON + Python file).
   */
  private async ensurePyodideRunner(): Promise<Runner> {
    if (!this.pyodideRunner) {
      const { PyodideRunner } = await import('./PyodideRunner');
      this.pyodideRunner = new PyodideRunner();
    }
    return this.pyodideRunner;
  }

  /**
   * Get the appropriate runner for a given entry file.
   * When LOCAL_EXEC_ENABLED is false, all execution routes to ServerRunner.
   * When true, lazily loads local runners on first use.
   */
  async getRunner(entry: string): Promise<Runner> {
    // Security gate: local execution disabled by default
    if (!LOCAL_EXEC_ENABLED) {
      return this.serverRunner;
    }

    const lang = getLanguageFromEntry(entry);
    
    // JavaScript and TypeScript: lazy-load JsRunner, use fallback pattern
    if (lang === 'javascript' || lang === 'typescript') {
      if (!this.jsFallbackRunner) {
        const jsRunner = await this.ensureJsRunner();
        this.jsFallbackRunner = new FallbackRunner(jsRunner, this.serverRunner);
      }
      return this.jsFallbackRunner;
    }
    
    // Python: lazy-load PyodideRunner, use fallback pattern
    if (lang === 'python') {
      if (!this.pyFallbackRunner) {
        const pyRunner = await this.ensurePyodideRunner();
        this.pyFallbackRunner = new FallbackRunner(pyRunner, this.serverRunner);
      }
      return this.pyFallbackRunner;
    }
    
    // Other languages: go to server
    return this.serverRunner;
  }

  /**
   * Get the JsRunner for loading state management.
   * Lazy-loads if not already loaded.
   */
  async getJsRunner(): Promise<Runner> {
    return this.ensureJsRunner();
  }

  /**
   * Get the PyodideRunner for loading state management.
   * Lazy-loads if not already loaded.
   */
  async getPyodideRunner(): Promise<Runner> {
    return this.ensurePyodideRunner();
  }

  /**
   * Clean up all runners.
   */
  dispose(): void {
    this.serverRunner.dispose();
    this.jsRunner?.dispose();
    this.pyodideRunner?.dispose();
  }
}
