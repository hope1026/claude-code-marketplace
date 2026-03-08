import { spawn } from "node:child_process";
import { atomicWriteFile, atomicWriteJson } from "../state/index.js";
import { buildExecutionPrompt, buildOutputFileArgs, buildResultJsonSchema } from "./prompts.js";
import type {
  AdapterDefinition,
  AdapterExecutionFailure,
  AdapterExecutionResult,
  AdapterRunContext,
  AgentResult
} from "./types.js";

const defaultAgentTimeoutMs = 15 * 60 * 1000;
const authRequiredPattern =
  /(auth(entication)? (required|failed)|not logged in|login required|please log in|please login|unauthorized|invalid api key|missing api key|expired token|sign in)/i;

interface AdapterProcessSpec {
  command: string;
  args: string[];
  outputMode: "file" | "stdout";
  timeoutMs: number;
}

interface AdapterProcessFailure extends Partial<AdapterExecutionFailure> {
  kind: "spawn" | "process_exit" | "timeout";
}

export async function runAdapter(
  context: AdapterRunContext
): Promise<AdapterExecutionResult> {
  const adapter = getAdapterDefinition(context.agent);

  try {
    return await adapter.execute(context);
  } catch (error) {
    throw adapter.normalizeError(error);
  }
}

export function getAdapterDefinition(agent: AdapterRunContext["agent"]): AdapterDefinition {
  switch (agent) {
    case "codex":
      return {
        preparePrompt: buildExecutionPrompt,
        execute: async (runContext) =>
          executeAdapterProcess(
            runContext,
            createProcessSpec(
              "codex",
              [
                "exec",
                "--skip-git-repo-check",
                "--dangerously-bypass-approvals-and-sandbox",
                "-C",
                runContext.workspacePath,
                "--output-schema",
                `${runContext.runDirectoryPath}/result.schema.json`,
                ...buildOutputFileArgs(runContext),
                runContext.promptText
              ],
              "file"
            )
          ),
        normalizeError: normalizeAdapterError
      };
    case "claude-code":
      return {
        preparePrompt: buildExecutionPrompt,
        execute: async (runContext) =>
          executeAdapterProcess(
            runContext,
            createProcessSpec(
              "claude",
              [
                "-p",
                "--dangerously-skip-permissions",
                "--output-format",
                "json",
                "--json-schema",
                JSON.stringify(buildResultJsonSchema()),
                runContext.promptText
              ],
              "stdout"
            )
          ),
        normalizeError: normalizeAdapterError
      };
    case "custom-command":
      return {
        preparePrompt: buildExecutionPrompt,
        execute: async (runContext) => {
          const customCommand = process.env.RALPH_CUSTOM_AGENT_COMMAND;

          if (customCommand === undefined || customCommand.trim().length === 0) {
            throw createAdapterFailure(
              "execution_failed",
              "custom-command adapter requires RALPH_CUSTOM_AGENT_COMMAND."
            );
          }

          return executeAdapterProcess(
            runContext,
            createProcessSpec("sh", ["-lc", customCommand], "file")
          );
        },
        normalizeError: normalizeAdapterError
      };
  }
}

export function parseAgentResult(rawResultText: string | null): AgentResult {
  if (rawResultText === null || rawResultText.trim().length === 0) {
    throw createAdapterFailure("malformed_result", "Agent did not return a result payload.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawResultText);
  } catch {
    throw createAdapterFailure("malformed_result", "Agent returned invalid JSON.");
  }

  if (isClaudeWrappedResult(parsed)) {
    return parsed.structured_output;
  }

  if (!isAgentResult(parsed)) {
    throw createAdapterFailure("malformed_result", "Agent result did not match the expected contract.");
  }

  return parsed;
}

export async function persistRunLogs(
  context: AdapterRunContext,
  result: AdapterExecutionResult | AdapterExecutionFailure
): Promise<void> {
  await Promise.all([
    atomicWriteFile(`${context.runDirectoryPath}/stdout.log`, `${result.stdout}`),
    atomicWriteFile(`${context.runDirectoryPath}/stderr.log`, `${result.stderr}`)
  ]);
}

export function createAdapterFailure(
  code: AdapterExecutionFailure["code"],
  message: string,
  options?: Partial<AdapterExecutionFailure>
): AdapterExecutionFailure {
  return {
    code,
    message,
    stdout: options?.stdout ?? "",
    stderr: options?.stderr ?? "",
    exitCode: options?.exitCode ?? null,
    signal: options?.signal ?? null
  };
}

async function executeAdapterProcess(
  context: AdapterRunContext,
  processSpec: AdapterProcessSpec
): Promise<AdapterExecutionResult> {
  await atomicWriteJson(`${context.runDirectoryPath}/result.schema.json`, buildResultJsonSchema());

  return new Promise<AdapterExecutionResult>((resolve, reject) => {
    const child = spawn(processSpec.command, processSpec.args, {
      cwd: context.workspacePath,
      env: {
        ...process.env,
        RALPH_WORKSPACE_PATH: context.workspacePath,
        RALPH_PROMPT_PATH: context.promptPath,
        RALPH_OUTPUT_PATH: context.outputPath,
        RALPH_RUN_DIRECTORY_PATH: context.runDirectoryPath
      }
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeoutId: NodeJS.Timeout | undefined;

    const finishReject = (error: AdapterProcessFailure | NodeJS.ErrnoException): void => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      reject(error);
    };

    const finishResolve = async (exitCode: number | null, signal: NodeJS.Signals | null): Promise<void> => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      const rawResultText =
        processSpec.outputMode === "stdout"
          ? stdout.trim() || null
          : await readRawResult(context.outputPath);

      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        rawResultText
      });
    };

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      const spawnError = error as NodeJS.ErrnoException;
      finishReject({
        kind: "spawn",
        message: spawnError.message,
        stdout,
        stderr,
        exitCode: null,
        signal: null,
        code: spawnError.code === "ENOENT" ? "cli_missing" : "execution_failed"
      });
    });

    child.on("close", (exitCode, signal) => {
      if (exitCode !== 0) {
        finishReject({
          kind: "process_exit",
          message: "Agent process exited with a non-zero status.",
          stdout,
          stderr,
          exitCode,
          signal
        });
        return;
      }

      void finishResolve(exitCode, signal).catch((error) => finishReject(error as NodeJS.ErrnoException));
    });

    timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      finishReject({
        kind: "timeout",
        message: `Agent process timed out after ${String(processSpec.timeoutMs)}ms.`,
        stdout,
        stderr,
        exitCode: null,
        signal: "SIGTERM"
      });
    }, processSpec.timeoutMs);
  });
}

function createProcessSpec(
  command: string,
  args: string[],
  outputMode: "file" | "stdout"
): AdapterProcessSpec {
  return {
    command,
    args,
    outputMode,
    timeoutMs: getAgentTimeoutMs()
  };
}

function normalizeAdapterError(error: unknown): AdapterExecutionFailure {
  if (isAdapterExecutionFailure(error)) {
    return error;
  }

  if (isAdapterProcessFailure(error)) {
    if (error.kind === "timeout") {
      return createAdapterFailure("timeout", error.message ?? "Agent process timed out.", error);
    }

    if (error.kind === "spawn" && error.code === "cli_missing") {
      return createAdapterFailure("cli_missing", error.message ?? "Agent CLI is missing.", error);
    }

    if (looksLikeAuthRequired(error.stdout ?? "", error.stderr ?? "", error.message ?? "")) {
      return createAdapterFailure(
        "auth_required",
        error.message ?? "Agent requires authentication before it can run.",
        error
      );
    }

    return createAdapterFailure(
      error.code === "cli_missing" ? "cli_missing" : "execution_failed",
      error.message ?? "Agent execution failed.",
      error
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    return createAdapterFailure("cli_missing", (error as NodeJS.ErrnoException).message);
  }

  return createAdapterFailure(
    "execution_failed",
    error instanceof Error ? error.message : "Execution failed."
  );
}

function isAgentResult(value: unknown): value is AgentResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const status = candidate.status;

  return (
    typeof candidate.task_id === "string" &&
    typeof candidate.summary === "string" &&
    typeof status === "string" &&
    ["completed", "partial", "blocked", "failed"].includes(status) &&
    (status !== "blocked" ||
      (isStringArray(candidate.blockers) && candidate.blockers.length > 0)) &&
    isStringArray(candidate.changed_files) &&
    isStringArray(candidate.artifacts) &&
    isStringArray(candidate.follow_up_tasks) &&
    isStringArray(candidate.user_checks) &&
    isStringArray(candidate.validation_hints) &&
    isStringArray(candidate.blockers)
  );
}

function isClaudeWrappedResult(
  value: unknown
): value is { structured_output: AgentResult } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isAgentResult(candidate.structured_output);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isAdapterExecutionFailure(error: unknown): error is AdapterExecutionFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "stdout" in error &&
    "stderr" in error
  );
}

function isAdapterProcessFailure(error: unknown): error is AdapterProcessFailure {
  return typeof error === "object" && error !== null && "kind" in error;
}

function looksLikeAuthRequired(stdout: string, stderr: string, message: string): boolean {
  return authRequiredPattern.test(`${stdout}\n${stderr}\n${message}`);
}

function getAgentTimeoutMs(): number {
  const raw = process.env.RALPH_AGENT_TIMEOUT_MS;

  if (raw === undefined) {
    return defaultAgentTimeoutMs;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultAgentTimeoutMs;
}

async function readRawResult(outputPath: string): Promise<string | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(outputPath, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}
