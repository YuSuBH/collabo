export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compilerError: string;
  exitCode: string; // Wandbox returns status as string ("0", "1", etc.)
  durationMs: number;
  entryFile: string;
  compiler: string;
  stdin?: string;
}

export interface SharedExecutionRun extends ExecutionResult {
  id: string;
  executorId: number;
  executorName: string;
  executorColor: string;
  timestamp: number;
}
