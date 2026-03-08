import { spawn } from "node:child_process";
import { atomicWriteFile, atomicWriteJson } from "../state/index.js";
import type {
  AdapterExecutionFailure,
  AdapterExecutionResult,
  AdapterRunContext,
  AgentResult
} from "./types.js";
import { buildOutputFileArgs, buildResultJsonSchema } from "./prompts.js";

export async function runAdapter(
  context: AdapterRunContext
): Promise<AdapterExecutionResult> {
  const commandSpec = getCommandSpec(context);
  const schemaPath = `${context.runDirectoryPath}/result.schema.json`;

  await atomicWriteJson(schemaPath, buildResultJsonSchema());

  const args = commandSpec.buildArgs(context, schemaPath);

  return new Promise<AdapterExecutionResult>((resolve, reject) => {
    const child = spawn(commandSpec.command, args, {
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

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(normalizeSpawnError(error, stdout, stderr));
    });

    child.on("close", async (exitCode, signal) => {
      let rawResultText: string | null = null;

      try {
        rawResultText =
          commandSpec.outputMode === "stdout"
            ? stdout.trim() || null
            : await readRawResult(context.outputPath);
      } catch (error) {
        reject(error);
        return;
      }

      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        rawResultText
      });
    });
  });
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

function getCommandSpec(context: AdapterRunContext): {
  command: string;
  outputMode: "file" | "stdout";
  buildArgs: (runContext: AdapterRunContext, schemaPath: string) => string[];
} {
  switch (context.agent) {
    case "codex":
      return {
        command: "codex",
        outputMode: "file",
        buildArgs: (runContext, schemaPath) => [
          "exec",
          "--skip-git-repo-check",
          "--dangerously-bypass-approvals-and-sandbox",
          "-C",
          runContext.workspacePath,
          "--output-schema",
          schemaPath,
          ...buildOutputFileArgs(runContext),
          runContext.promptText
        ]
      };
    case "claude-code":
      return {
        command: "claude",
        outputMode: "stdout",
        buildArgs: (runContext, schemaPath) => [
          "-p",
          "--dangerously-skip-permissions",
          "--output-format",
          "json",
          "--json-schema",
          JSON.stringify(buildResultJsonSchema()),
          runContext.promptText
        ]
      };
    case "custom-command":
      return {
        command: "sh",
        outputMode: "file",
        buildArgs: () => {
          const customCommand = process.env.RALPH_CUSTOM_AGENT_COMMAND;

          if (customCommand === undefined || customCommand.trim().length === 0) {
            throw createAdapterFailure(
              "execution_failed",
              "custom-command adapter requires RALPH_CUSTOM_AGENT_COMMAND."
            );
          }

          return ["-lc", customCommand];
        }
      };
  }
}

function normalizeSpawnError(
  error: NodeJS.ErrnoException,
  stdout: string,
  stderr: string
): AdapterExecutionFailure {
  if (error.code === "ENOENT") {
    return createAdapterFailure("cli_missing", error.message, { stdout, stderr });
  }

  return createAdapterFailure("execution_failed", error.message, { stdout, stderr });
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
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
