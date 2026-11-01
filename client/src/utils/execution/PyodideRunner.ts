/**
 * Python runner using Pyodide 314.0.7 (Python 3.14.2).
 * Runs code in a module worker with lazy loading and warm worker reuse.
 * 
 * IMPORTANT: Pyodide 314.x no longer supports classic (non-module) workers.
 * Workers must be created with { type: 'module' }.
 * 
 * Known limitations in Pyodide 314:
 * - ssl module is a stub (no real TLS)
 * - Some hashlib algorithms are missing
 * - No interactive input() support (stdin is pre-provided)
 */

import type { Runner, ExecRequest, ExecResult, StreamChunk } from './types';

// Pyodide version - keep npm package and CDN in sync
const PYODIDE_VERSION = '314.0.7';
const PYODIDE_CDN_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Output cap utilities
const MAX_OUTPUT_SIZE = 100 * 1024; // 100 KB
const TRUNCATION_MARKER = '\n[output truncated - exceeded 100KB limit]\n';

function truncateOutput(text: string): string {
  if (text.length <= MAX_OUTPUT_SIZE) return text;
  return text.slice(0, MAX_OUTPUT_SIZE) + TRUNCATION_MARKER;
}

interface WorkerMessage {
  type: 'ready' | 'output' | 'exit' | 'error' | 'loading';
  stream?: 'out' | 'err';
  text?: string;
  exitCode?: number;
  error?: string;
  progress?: string;
}

export type PyodideLoadingState = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Callback for loading state changes.
 */
export type LoadingCallback = (state: PyodideLoadingState, message?: string) => void;

export class PyodideRunner implements Runner {
  private worker: Worker | null = null;
  private workerReady = false;
  private loadingState: PyodideLoadingState = 'idle';
  private loadingPromise: Promise<void> | null = null;
  private loadingCallbacks: LoadingCallback[] = [];

  /**
   * Register a callback for loading state changes.
   */
  onLoadingStateChange(callback: LoadingCallback): void {
    this.loadingCallbacks.push(callback);
  }

  /**
   * Get current loading state.
   */
  getLoadingState(): PyodideLoadingState {
    return this.loadingState;
  }

  private setLoadingState(state: PyodideLoadingState, message?: string): void {
    this.loadingState = state;
    this.loadingCallbacks.forEach((cb) => cb(state, message));
  }

  private async ensureWorkerReady(): Promise<void> {
    if (this.workerReady) return;

    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = this.initWorker();
    await this.loadingPromise;
  }

  private async initWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setLoadingState('loading', 'Downloading Python runtime...');

      // Create the Pyodide worker code
      // CRITICAL: Must use { type: 'module' } - classic workers are not supported in Pyodide 314.x
      const workerCode = `
import { loadPyodide } from '${PYODIDE_CDN_URL}pyodide.mjs';

let pyodide = null;
let outputBuffer = { out: '', err: '' };
let flushTimer = null;

// Batch output for performance
function flushOutput() {
  if (outputBuffer.out) {
    self.postMessage({ type: 'output', stream: 'out', text: outputBuffer.out });
    outputBuffer.out = '';
  }
  if (outputBuffer.err) {
    self.postMessage({ type: 'output', stream: 'err', text: outputBuffer.err });
    outputBuffer.err = '';
  }
  flushTimer = null;
}

function scheduleFlush() {
  if (!flushTimer) {
    flushTimer = setTimeout(flushOutput, 10);
  }
}

async function init() {
  try {
    self.postMessage({ type: 'loading', progress: 'Loading Pyodide runtime...' });
    
    pyodide = await loadPyodide({
      indexURL: '${PYODIDE_CDN_URL}',
      stdout: (text) => {
        outputBuffer.out += text;
        scheduleFlush();
      },
      stderr: (text) => {
        outputBuffer.err += text;
        scheduleFlush();
      },
    });

    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'error', error: 'Failed to load Pyodide: ' + err.message });
  }
}

self.addEventListener('message', async (event) => {
  const { type, entry, files, stdin } = event.data;

  if (type === 'init') {
    await init();
    return;
  }

  if (type === 'exec' && pyodide) {
    try {
      // Write files to Pyodide's in-memory filesystem
      const fs = pyodide.FS;
      
      // Create a working directory
      const workdir = '/work';
      try {
        fs.mkdir(workdir);
      } catch (e) {
        // Directory might already exist
      }
      fs.chdir(workdir);

      // Write all files
      for (const file of files) {
        const filepath = workdir + '/' + file.file;
        const dir = filepath.substring(0, filepath.lastIndexOf('/'));
        
        // Create parent directories if needed
        if (dir !== workdir) {
          const parts = dir.substring(workdir.length + 1).split('/');
          let current = workdir;
          for (const part of parts) {
            current += '/' + part;
            try {
              fs.mkdir(current);
            } catch (e) {
              // Directory exists
            }
          }
        }
        
        fs.writeFile(filepath, file.code);
      }

      // Add working directory to sys.path
      pyodide.runPython(\`
import sys
if '/work' not in sys.path:
    sys.path.insert(0, '/work')
\`);

      // Set stdin if provided
      if (stdin) {
        pyodide.setStdin({ stdin: () => stdin });
      }

      // Run the entry file using runpy.run_path for proper module execution
      const entryPath = workdir + '/' + entry;
      const escapedPath = entryPath.replace(/'/g, "\\\\'");
      pyodide.runPython(\`
import runpy
import sys

try:
    # Run the entry file as a module
    runpy.run_path('\${escapedPath}', run_name='__main__')
    exit_code = 0
except SystemExit as e:
    exit_code = e.code if isinstance(e.code, int) else (1 if e.code else 0)
except Exception as e:
    import traceback
    traceback.print_exc()
    exit_code = 1

sys.stdout.flush()
sys.stderr.flush()
\`);

      // Flush any remaining output
      flushOutput();

      // Get exit code
      const exitCode = pyodide.runPython('exit_code');

      self.postMessage({ type: 'exit', exitCode: exitCode || 0 });

      // Cleanup
      try {
        pyodide.runPython(\`
import sys
if '/work' in sys.path:
    sys.path.remove('/work')
\`);
        // Clean up files
        const files_to_remove = fs.readdir(workdir).filter(f => f !== '.' && f !== '..');
        for (const f of files_to_remove) {
          try {
            fs.unlink(workdir + '/' + f);
          } catch (e) {
            // Ignore errors
          }
        }
      } catch (e) {
        // Cleanup errors are non-fatal
      }

    } catch (err) {
      flushOutput();
      self.postMessage({ 
        type: 'error', 
        error: err.stack || err.message || String(err) 
      });
    }
  }
});
`;

      try {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        // CRITICAL: Use { type: 'module' } for Pyodide 314.x
        this.worker = new Worker(workerUrl, { type: 'module' });

        const timeout = setTimeout(() => {
          this.setLoadingState('failed', 'Pyodide failed to load (timeout)');
          reject(new Error('Pyodide worker initialization timeout'));
        }, 60000); // 60 second timeout for initial load

        this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          const msg = e.data;

          if (msg.type === 'loading') {
            this.setLoadingState('loading', msg.progress);
          } else if (msg.type === 'ready') {
            clearTimeout(timeout);
            this.workerReady = true;
            this.setLoadingState('ready', 'Python runtime ready');
            URL.revokeObjectURL(workerUrl);
            resolve();
          } else if (msg.type === 'error') {
            clearTimeout(timeout);
            this.setLoadingState('failed', msg.error);
            URL.revokeObjectURL(workerUrl);
            reject(new Error(msg.error || 'Pyodide initialization failed'));
          }
        };

        this.worker.onerror = (err) => {
          clearTimeout(timeout);
          this.setLoadingState('failed', 'Worker error');
          URL.revokeObjectURL(workerUrl);
          reject(new Error(`Pyodide worker error: ${err.message}`));
        };

        // Start initialization
        this.worker.postMessage({ type: 'init' });

      } catch (err) {
        this.setLoadingState('failed', 'Failed to create worker');
        reject(err);
      }
    });
  }

  async run(
    req: ExecRequest,
    onOutput?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ExecResult> {
    const { entry, files, stdin = '', timeoutMs } = req;

    try {
      // Ensure Pyodide is loaded
      await this.ensureWorkerReady();

      if (!this.worker || !this.workerReady) {
        return {
          status: '1',
          program_output: '',
          program_error: 'Pyodide worker not ready',
          compiler_error: '',
        };
      }

      return await this.runInWorker(entry, files, stdin, timeoutMs, onOutput, signal);
    } catch (err) {
      return {
        status: '1',
        program_output: '',
        program_error: err instanceof Error ? err.message : 'Pyodide initialization failed',
        compiler_error: '',
      };
    }
  }

  private async runInWorker(
    entry: string,
    files: { file: string; code: string }[],
    stdin: string,
    timeoutMs: number,
    onOutput?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ExecResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let hasExited = false;
      let timedOut = false;

      if (!this.worker) {
        resolve({
          status: '1',
          program_output: '',
          program_error: 'Worker not available',
          compiler_error: '',
        });
        return;
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        if (this.worker && !hasExited) {
          // Terminate and recreate worker on timeout
          this.worker.terminate();
          this.worker = null;
          this.workerReady = false;
          this.loadingPromise = null;
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
          this.workerReady = false;
          this.loadingPromise = null;
          resolve({
            status: '130', // SIGINT
            program_output: truncateOutput(stdout),
            program_error: truncateOutput(stderr + '\nExecution cancelled by user'),
            compiler_error: '',
          });
        }
      };
      signal?.addEventListener('abort', abortHandler);

      const messageHandler = (e: MessageEvent<WorkerMessage>) => {
        const msg = e.data;

        if (msg.type === 'output') {
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
            if (this.worker) {
              this.worker.removeEventListener('message', messageHandler);
            }
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
              this.worker.removeEventListener('message', messageHandler);
            }
            resolve({
              status: '1',
              program_output: truncateOutput(stdout),
              program_error: truncateOutput(stderr + (msg.error || 'Runtime error')),
              compiler_error: '',
            });
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);

      this.worker.onerror = (err) => {
        if (!hasExited && !timedOut) {
          hasExited = true;
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', abortHandler);
          resolve({
            status: '1',
            program_output: truncateOutput(stdout),
            program_error: truncateOutput(stderr + `\nWorker error: ${err.message}`),
            compiler_error: '',
          });
        }
      };

      // Send execution request
      this.worker.postMessage({
        type: 'exec',
        entry,
        files,
        stdin,
      });
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
      this.loadingPromise = null;
    }
    this.loadingCallbacks = [];
    this.setLoadingState('idle');
  }
}
