/**
 * JavaScript/TypeScript runner using esbuild-wasm for bundling.
 * Runs code in a sandboxed worker with console/process shims.
 * Falls back to server if code uses unsupported Node.js features.
 */

import * as esbuild from 'esbuild-wasm';
import type { Runner, ExecRequest, ExecResult, StreamChunk } from './types';

// Track esbuild initialization
let esbuildInitialized = false;
let esbuildInitPromise: Promise<void> | null = null;

interface WorkerMessage {
  type: 'output' | 'exit' | 'error' | 'ready';
  stream?: 'out' | 'err';
  text?: string;
  exitCode?: number;
  error?: string;
}

/**
 * Custom error type for unsupported features that require fallback to server.
 */
export class UnsupportedLocallyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedLocallyError';
  }
}

/**
 * Output cap utilities
 */
const MAX_OUTPUT_SIZE = 100 * 1024; // 100 KB
const TRUNCATION_MARKER = '\n[output truncated - exceeded 100KB limit]\n';

function truncateOutput(text: string): string {
  if (text.length <= MAX_OUTPUT_SIZE) return text;
  return text.slice(0, MAX_OUTPUT_SIZE) + TRUNCATION_MARKER;
}

export class JsRunner implements Runner {
  private worker: Worker | null = null;

  constructor() {
    // Initialize esbuild on first use
    if (!esbuildInitialized && !esbuildInitPromise) {
      esbuildInitPromise = this.initEsbuild();
    }
  }

  private async initEsbuild(): Promise<void> {
    if (esbuildInitialized) return;
    
    try {
      // Initialize esbuild-wasm with the WASM binary
      // Use ?url import to get the path to the WASM file
      const wasmURL = new URL('esbuild-wasm/esbuild.wasm', import.meta.url).href;
      await esbuild.initialize({ wasmURL });
      esbuildInitialized = true;
    } catch (err) {
      console.error('[JsRunner] Failed to initialize esbuild:', err);
      throw new UnsupportedLocallyError('Failed to initialize esbuild-wasm');
    }
  }

  async run(
    req: ExecRequest,
    onOutput?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ExecResult> {
    // Ensure esbuild is initialized
    if (esbuildInitPromise) {
      await esbuildInitPromise;
    }

    const { entry, files, stdin = '', timeoutMs } = req;

    try {
      // Bundle the code with esbuild
      const bundleResult = await this.bundle(entry, files);
      
      if (!bundleResult.success) {
        return {
          status: '1',
          program_output: '',
          program_error: bundleResult.error || 'Bundling failed',
          compiler_error: bundleResult.compilerError || '',
        };
      }

      // Run the bundled code in a worker
      return await this.runInWorker(
        bundleResult.code!,
        stdin,
        timeoutMs,
        onOutput,
        signal
      );
    } catch (err) {
      if (err instanceof UnsupportedLocallyError) {
        throw err; // Let registry handle fallback
      }
      return {
        status: '1',
        program_output: '',
        program_error: err instanceof Error ? err.message : 'Unknown error',
        compiler_error: '',
      };
    }
  }

  private async bundle(
    entry: string,
    files: { file: string; code: string }[]
  ): Promise<{
    success: boolean;
    code?: string;
    error?: string;
    compilerError?: string;
  }> {
    try {
      // Create a virtual file system plugin for esbuild
      const virtualFsPlugin: esbuild.Plugin = {
        name: 'virtual-fs',
        setup(build) {
          // Map file paths to code content
          const fileMap = new Map<string, string>();
          for (const f of files) {
            fileMap.set('/' + f.file, f.code);
            fileMap.set(f.file, f.code);
            // Also handle without extension for imports
            const withoutExt = f.file.replace(/\.[^/.]+$/, '');
            fileMap.set('/' + withoutExt, f.code);
          }

          // Resolve imports from our virtual file system
          build.onResolve({ filter: /.*/ }, (args) => {
            // Handle relative imports
            if (args.path.startsWith('./') || args.path.startsWith('../')) {
              const resolved = new URL(args.path, 'file://' + args.importer).pathname;
              if (fileMap.has(resolved)) {
                return { path: resolved, namespace: 'virtual-fs' };
              }
              // Try with common extensions
              for (const ext of ['.js', '.jsx', '.ts', '.tsx']) {
                if (fileMap.has(resolved + ext)) {
                  return { path: resolved + ext, namespace: 'virtual-fs' };
                }
              }
            }

            // Check if it's in our file map directly
            if (fileMap.has('/' + args.path)) {
              return { path: '/' + args.path, namespace: 'virtual-fs' };
            }
            if (fileMap.has(args.path)) {
              return { path: args.path, namespace: 'virtual-fs' };
            }

            // Check for Node.js built-ins or npm packages
            if (
              !args.path.startsWith('.') &&
              !args.path.startsWith('/')
            ) {
              // This is likely a node built-in or npm package - unsupported locally
              throw new UnsupportedLocallyError(
                `Import of external module "${args.path}" requires server execution`
              );
            }

            return undefined;
          });

          build.onLoad({ filter: /.*/, namespace: 'virtual-fs' }, (args) => {
            const contents = fileMap.get(args.path);
            if (contents === undefined) {
              return {
                errors: [
                  {
                    text: `File not found: ${args.path}`,
                    location: null,
                  },
                ],
              };
            }

            // Determine loader based on extension
            const ext = args.path.split('.').pop() || 'js';
            const loaderMap: Record<string, esbuild.Loader> = {
              js: 'js',
              jsx: 'jsx',
              ts: 'ts',
              tsx: 'tsx',
              json: 'json',
            };

            return {
              contents,
              loader: loaderMap[ext] || 'js',
            };
          });
        },
      };

      const result = await esbuild.build({
        entryPoints: ['/' + entry],
        bundle: true,
        write: false,
        format: 'esm',
        target: 'es2020',
        plugins: [virtualFsPlugin],
        logLevel: 'silent', // We'll handle errors ourselves
      });

      if (result.errors.length > 0) {
        const errorMsg = result.errors
          .map((e) => e.text)
          .join('\n');
        return {
          success: false,
          error: 'Compilation failed',
          compilerError: errorMsg,
        };
      }

      const code = result.outputFiles[0]?.text;
      if (!code) {
        return {
          success: false,
          error: 'No output from bundler',
        };
      }

      return {
        success: true,
        code,
      };
    } catch (err) {
      if (err instanceof UnsupportedLocallyError) {
        throw err;
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown bundling error',
      };
    }
  }

  private async runInWorker(
    code: string,
    _stdin: string,
    timeoutMs: number,
    onOutput?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ExecResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let hasExited = false;
      let timedOut = false;

      // Terminate any existing worker
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      // Worker code with console shims
      const workerCode = `
// Minimal process shim
const process = {
  argv: ['node', 'script.js'],
  env: {},
  exit: (code) => {
    self.postMessage({ type: 'exit', exitCode: code || 0 });
  },
  stdout: {
    write: (text) => {
      self.postMessage({ type: 'output', stream: 'out', text: String(text) });
    }
  },
  stderr: {
    write: (text) => {
      self.postMessage({ type: 'output', stream: 'err', text: String(text) });
    }
  }
};

// Console shims
const console = {
  log: (...args) => {
    const text = args.map(a => String(a)).join(' ') + '\\n';
    self.postMessage({ type: 'output', stream: 'out', text });
  },
  info: (...args) => {
    const text = args.map(a => String(a)).join(' ') + '\\n';
    self.postMessage({ type: 'output', stream: 'out', text });
  },
  warn: (...args) => {
    const text = args.map(a => String(a)).join(' ') + '\\n';
    self.postMessage({ type: 'output', stream: 'err', text });
  },
  error: (...args) => {
    const text = args.map(a => String(a)).join(' ') + '\\n';
    self.postMessage({ type: 'output', stream: 'err', text });
  }
};

// User code
(async () => {
  try {
    self.postMessage({ type: 'ready' });
    ${code}
    self.postMessage({ type: 'exit', exitCode: 0 });
  } catch (err) {
    self.postMessage({ 
      type: 'error', 
      error: err.stack || err.message || String(err)
    });
  }
})();
`;

      // Create worker
      try {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl, { type: 'module' });

        // Set up timeout
        const timeoutId = setTimeout(() => {
          timedOut = true;
          if (this.worker && !hasExited) {
            this.worker.terminate();
            this.worker = null;
            resolve({
              status: '124',
              program_output: truncateOutput(stdout),
              program_error: truncateOutput(stderr + `\nExecution timed out after ${timeoutMs / 1000}s`),
              compiler_error: '',
            });
          }
        }, timeoutMs);

        // Handle abort signal
        const abortHandler = () => {
          if (!hasExited && this.worker) {
            clearTimeout(timeoutId);
            this.worker.terminate();
            this.worker = null;
            resolve({
              status: '130', // SIGINT
              program_output: truncateOutput(stdout),
              program_error: truncateOutput(stderr + '\nExecution cancelled by user'),
              compiler_error: '',
            });
          }
        };
        signal?.addEventListener('abort', abortHandler);

        this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          const msg = e.data;

          if (msg.type === 'ready') {
            // Worker is ready (not currently used)
          } else if (msg.type === 'output') {
            const text = msg.text || '';
            if (msg.stream === 'out') {
              stdout += text;
              onOutput?.({ stream: 'out', text });
            } else if (msg.stream === 'err') {
              stderr += text;
              onOutput?.({ stream: 'err', text });
            }
          } else if (msg.type === 'exit') {
            if (!hasExited && !timedOut) {
              hasExited = true;
              clearTimeout(timeoutId);
              signal?.removeEventListener('abort', abortHandler);
              URL.revokeObjectURL(workerUrl);
              resolve({
                status: String(msg.exitCode || 0),
                program_output: truncateOutput(stdout),
                program_error: truncateOutput(stderr),
                compiler_error: '',
              });
            }
          } else if (msg.type === 'error') {
            if (!hasExited && !timedOut) {
              hasExited = true;
              clearTimeout(timeoutId);
              signal?.removeEventListener('abort', abortHandler);
              if (this.worker) {
                this.worker.terminate();
                this.worker = null;
              }
              URL.revokeObjectURL(workerUrl);
              resolve({
                status: '1',
                program_output: truncateOutput(stdout),
                program_error: truncateOutput(stderr + (msg.error || 'Runtime error')),
                compiler_error: '',
              });
            }
          }
        };

        this.worker.onerror = (err) => {
          if (!hasExited && !timedOut) {
            hasExited = true;
            clearTimeout(timeoutId);
            signal?.removeEventListener('abort', abortHandler);
            if (this.worker) {
              this.worker.terminate();
              this.worker = null;
            }
            URL.revokeObjectURL(workerUrl);
            resolve({
              status: '1',
              program_output: truncateOutput(stdout),
              program_error: truncateOutput(stderr + `\nWorker error: ${err.message}`),
              compiler_error: '',
            });
          }
        };
      } catch (err) {
        resolve({
          status: '1',
          program_output: '',
          program_error: err instanceof Error ? err.message : 'Failed to create worker',
          compiler_error: '',
        });
      }
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
