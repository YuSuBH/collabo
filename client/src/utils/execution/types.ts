/**
 * Core types for the execution runner system.
 * Shared between local and server-based execution backends.
 */

export interface CodeFile {
  file: string;
  code: string;
}

export interface ExecRequest {
  entry: string;
  files: CodeFile[];
  stdin?: string;
  timeoutMs: number;
}

export interface ExecResult {
  status: string;
  program_output: string;
  program_error: string;
  compiler_error: string;
}

export interface StreamChunk {
  stream: 'out' | 'err';
  text: string;
}

/**
 * Base interface for execution runners.
 * Implementations handle local in-browser execution or server-side execution.
 */
export interface Runner {
  /**
   * Execute code with optional streaming output and abort signal.
   * @param req - Execution request with entry file, code files, stdin, and timeout
   * @param onOutput - Optional callback for streaming output chunks
   * @param signal - Optional AbortSignal for cancellation
   * @returns Promise resolving to execution result
   */
  run(
    req: ExecRequest,
    onOutput?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ExecResult>;

  /**
   * Clean up any resources held by this runner.
   */
  dispose(): void;
}
