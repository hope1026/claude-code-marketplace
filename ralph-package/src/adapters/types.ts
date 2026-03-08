import type { InputDocumentRecord } from "../job/types.js";

export type AdapterErrorCode =
  | "timeout"
  | "cli_missing"
  | "auth_required"
  | "malformed_result"
  | "execution_failed";

export type ResultStatus = "completed" | "partial" | "blocked" | "failed";

export interface AgentResult {
  status: ResultStatus;
  task_id: string;
  summary: string;
  changed_files: string[];
  artifacts: string[];
  follow_up_tasks: string[];
  user_checks: string[];
  validation_hints: string[];
  blockers: string[];
}

export interface AdapterPromptContext {
  title: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  workspacePath: string;
  specPath: string;
  planPath: string;
  inputManifestPath: string;
  inputDocuments: InputDocumentRecord[];
}

export interface AdapterRunContext {
  agent: "codex" | "claude-code" | "custom-command";
  workspacePath: string;
  promptPath: string;
  promptText: string;
  outputPath: string;
  runDirectoryPath: string;
}

export interface AdapterDefinition {
  preparePrompt: (context: AdapterPromptContext) => string;
  execute: (runContext: AdapterRunContext) => Promise<AdapterExecutionResult>;
  normalizeError: (error: unknown) => AdapterExecutionFailure;
}

export interface AdapterExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  rawResultText: string | null;
}

export interface AdapterExecutionFailure {
  code: AdapterErrorCode;
  message: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export interface RalphRunRecord {
  runId: string;
  taskId: string;
  agent: string;
  startedAt: string;
  finishedAt: string | null;
  status: ResultStatus | "running";
  summary: string;
  changedFiles: string[];
  blockers: string[];
  userChecks: string[];
  validationHints: string[];
  artifacts: string[];
  followUpTasks: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  errorCode?: AdapterErrorCode;
}
