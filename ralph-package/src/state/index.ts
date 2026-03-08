import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const stateFeature = {
  rootDirectoryName: ".ralph-cache",
  defaultLocationBase: "workspacePath",
  cliOverrideFlag: "--state-dir"
} as const;

export interface ResolveStateOptions {
  workspacePath?: string;
  stateDirectoryPath?: string;
  cwd?: string;
}

export interface JobPaths {
  rootDirectoryPath: string;
  jobsDirectoryPath: string;
  currentJobPath: string;
  jobDirectoryPath: string;
  jobJsonPath: string;
  inputsJsonPath: string;
  specMarkdownPath: string;
  planMarkdownPath: string;
  tasksJsonPath: string;
  runtimeJsonPath: string;
  finalSummaryPath: string;
  userChecksPath: string;
  validationsDirectoryPath: string;
  runsDirectoryPath: string;
  artifactsDirectoryPath: string;
}

export interface RunPaths {
  runDirectoryPath: string;
  promptPath: string;
  resultPath: string;
  runRecordPath: string;
  stdoutLogPath: string;
  stderrLogPath: string;
  outputPath: string;
}

export function resolveWorkspacePath(
  workspacePath?: string,
  cwd = process.cwd()
): string {
  return resolve(cwd, workspacePath ?? ".");
}

export function resolveStateDirectoryPath({
  workspacePath,
  stateDirectoryPath,
  cwd = process.cwd()
}: ResolveStateOptions): string {
  if (stateDirectoryPath !== undefined) {
    return resolve(cwd, stateDirectoryPath);
  }

  const resolvedWorkspacePath = resolveWorkspacePath(workspacePath, cwd);
  return join(resolvedWorkspacePath, stateFeature.rootDirectoryName);
}

export function getJobPaths(jobId: string, rootDirectoryPath: string): JobPaths {
  const jobDirectoryPath = join(rootDirectoryPath, "jobs", jobId);

  return {
    rootDirectoryPath,
    jobsDirectoryPath: join(rootDirectoryPath, "jobs"),
    currentJobPath: join(rootDirectoryPath, "current-job.txt"),
    jobDirectoryPath,
    jobJsonPath: join(jobDirectoryPath, "job.json"),
    inputsJsonPath: join(jobDirectoryPath, "inputs.json"),
    specMarkdownPath: join(jobDirectoryPath, "spec.md"),
    planMarkdownPath: join(jobDirectoryPath, "plan.md"),
    tasksJsonPath: join(jobDirectoryPath, "tasks.json"),
    runtimeJsonPath: join(jobDirectoryPath, "runtime.json"),
    finalSummaryPath: join(jobDirectoryPath, "final-summary.md"),
    userChecksPath: join(jobDirectoryPath, "user-checks.md"),
    validationsDirectoryPath: join(jobDirectoryPath, "validations"),
    runsDirectoryPath: join(jobDirectoryPath, "runs"),
    artifactsDirectoryPath: join(jobDirectoryPath, "artifacts")
  };
}

export async function ensureStateRoot(rootDirectoryPath: string): Promise<void> {
  await mkdir(join(rootDirectoryPath, "jobs"), { recursive: true });
}

export async function ensureJobDirectories(jobPaths: JobPaths): Promise<void> {
  await ensureStateRoot(jobPaths.rootDirectoryPath);
  await mkdir(jobPaths.jobDirectoryPath, { recursive: true });
  await mkdir(jobPaths.validationsDirectoryPath, { recursive: true });
  await mkdir(jobPaths.runsDirectoryPath, { recursive: true });
  await mkdir(jobPaths.artifactsDirectoryPath, { recursive: true });
}

export async function ensureRunDirectory(runDirectoryPath: string): Promise<void> {
  await mkdir(runDirectoryPath, { recursive: true });
}

export async function atomicWriteFile(
  filePath: string,
  content: string
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

export async function atomicWriteJson(
  filePath: string,
  value: unknown
): Promise<void> {
  await atomicWriteFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readTextFile(
  filePath: string
): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

export async function readJsonFile<T>(
  filePath: string
): Promise<T | undefined> {
  const content = await readTextFile(filePath);

  if (content === undefined) {
    return undefined;
  }

  return JSON.parse(content) as T;
}

export function getNextRunId(lastRunId: string | null): string {
  const previousNumber =
    lastRunId === null ? 0 : Number.parseInt(lastRunId.replace("run-", ""), 10);
  const nextNumber = Number.isFinite(previousNumber) ? previousNumber + 1 : 1;
  return `run-${String(nextNumber).padStart(3, "0")}`;
}

export function getRunPaths(
  runsDirectoryPath: string,
  runId: string
): RunPaths {
  const runDirectoryPath = join(runsDirectoryPath, runId);

  return {
    runDirectoryPath,
    promptPath: join(runDirectoryPath, "prompt.md"),
    resultPath: join(runDirectoryPath, "result.json"),
    runRecordPath: join(runDirectoryPath, "run-record.json"),
    stdoutLogPath: join(runDirectoryPath, "stdout.log"),
    stderrLogPath: join(runDirectoryPath, "stderr.log"),
    outputPath: join(runDirectoryPath, "agent-output.json")
  };
}

export function getValidationPath(
  validationsDirectoryPath: string,
  validationIndex: number
): string {
  return join(
    validationsDirectoryPath,
    `validation-${String(validationIndex).padStart(3, "0")}.json`
  );
}

export async function listDirectoryEntries(
  directoryPath: string
): Promise<string[]> {
  try {
    return await readdir(directoryPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }

    throw error;
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
