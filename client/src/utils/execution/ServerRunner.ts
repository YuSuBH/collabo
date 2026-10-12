/**
 * Server-based execution runner.
 * Proxies execution requests to the backend Wandbox API endpoint.
 */

import type { Runner, ExecRequest, ExecResult } from './types';

const EXECUTE_API_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/execute';

export class ServerRunner implements Runner {
  async run(req: ExecRequest): Promise<ExecResult> {
    const { entry, files, stdin = '', timeoutMs } = req;

    // Determine compiler from entry file extension
    const compiler = this.getCompilerFromEntry(entry);
    if (!compiler) {
      return {
        status: '1',
        program_output: '',
        program_error: `Unsupported file type: ${entry}`,
        compiler_error: '',
      };
    }

    // Extract entry file code from files array
    const entryFileObj = files.find((f) => f.file === entry);
    if (!entryFileObj) {
      return {
        status: '1',
        program_output: '',
        program_error: `Entry file "${entry}" not found in files`,
        compiler_error: '',
      };
    }

    // Other files are passed as "codes" to Wandbox
    const codes = files.filter((f) => f.file !== entry);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(EXECUTE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler,
          code: entryFileObj.code,
          codes: codes.length > 0 ? codes : undefined,
          stdin,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        return {
          status: '1',
          program_output: '',
          program_error: data.error ?? `Server error (HTTP ${res.status})`,
          compiler_error: '',
        };
      }

      return {
        status: data.status ?? '-1',
        program_output: data.program_output ?? '',
        program_error: data.program_error ?? '',
        compiler_error: data.compiler_error ?? '',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          status: '124',
          program_output: '',
          program_error: `Execution timed out after ${timeoutMs / 1000}s`,
          compiler_error: '',
        };
      }
      return {
        status: '1',
        program_output: '',
        program_error: err?.message ?? 'Network error',
        compiler_error: '',
      };
    }
  }

  dispose(): void {
    // No resources to clean up for server runner
  }

  private getCompilerFromEntry(entry: string): string | null {
    const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase();
    const compilerMap: Record<string, string> = {
      '.js': 'nodejs-20.17.0',
      '.jsx': 'nodejs-20.17.0',
      '.mjs': 'nodejs-20.17.0',
      '.cjs': 'nodejs-20.17.0',
      '.ts': 'typescript-5.6.2',
      '.tsx': 'typescript-5.6.2',
      '.mts': 'typescript-5.6.2',
      '.cts': 'typescript-5.6.2',
      '.py': 'cpython-3.12.7',
    };
    return compilerMap[ext] ?? null;
  }
}
