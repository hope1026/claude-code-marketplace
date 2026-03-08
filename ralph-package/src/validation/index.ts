import { spawn } from "node:child_process";
import type { AgentResult } from "../adapters/index.js";
import { atomicWriteJson, getValidationPath } from "../state/index.js";

export const validationFeature = {
  name: "validation"
} as const;

export interface ValidationCommandResult {
  command: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  status: "passed" | "failed";
}

export interface ValidationRecord {
  id: string;
  status: "passed" | "failed";
  hints: string[];
  checkedAt: string;
  summary: string;
  commandResults: ValidationCommandResult[];
}

export function applyValidationOutcome(
  agentResult: AgentResult,
  validationRecord: ValidationRecord
): AgentResult {
  if (validationRecord.status !== "failed") {
    return agentResult;
  }

  return {
    ...agentResult,
    status: "failed",
    blockers: [...agentResult.blockers, validationRecord.summary]
  };
}

export async function runValidation(options: {
  jobId: string;
  taskId: string;
  validationHints: AgentResult["validation_hints"];
  workspacePath: string;
  commands: string[];
  validationsDirectoryPath: string;
  validationIndex: number;
}): Promise<ValidationRecord> {
  const commandResults = await Promise.all(
    options.commands.map((command) => executeValidationCommand(command, options.workspacePath))
  );
  const hasFailedCommand = commandResults.some((commandResult) => commandResult.status === "failed");
  const record: ValidationRecord = {
    id: `validation-${String(options.validationIndex).padStart(3, "0")}`,
    status: hasFailedCommand ? "failed" : "passed",
    hints: options.validationHints,
    checkedAt: new Date().toISOString(),
    summary:
      commandResults.length === 0
        ? options.validationHints.length > 0
          ? "Validation hints recorded. No executable validations configured yet."
          : "No executable validations configured. Passing by default."
        : hasFailedCommand
          ? "One or more validation commands failed."
          : "All validation commands passed.",
    commandResults
  };

  await atomicWriteJson(getValidationPath(options.validationsDirectoryPath, options.validationIndex), record);

  return record;
}

async function executeValidationCommand(
  command: string,
  workspacePath: string
): Promise<ValidationCommandResult> {
  return new Promise<ValidationCommandResult>((resolve, reject) => {
    const child = spawn("sh", ["-lc", command], {
      cwd: workspacePath,
      env: process.env
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
      reject(error);
    });

    child.on("close", (exitCode, signal) => {
      resolve({
        command,
        exitCode,
        signal,
        stdout,
        stderr,
        status: exitCode === 0 ? "passed" : "failed"
      });
    });
  });
}
