import type { SupportedAgent } from "../adapters/index.js";
import type { AgentResult, RalphRunRecord } from "../adapters/index.js";
import { createInitialPlan } from "../planning/index.js";
import {
  atomicWriteFile,
  atomicWriteJson,
  ensureJobDirectories,
  getRunPaths,
  getValidationPath,
  getJobPaths,
  listDirectoryEntries,
  readJsonFile,
  readTextFile,
  resolveStateDirectoryPath,
  resolveWorkspacePath
} from "../state/index.js";
import { slugify, toIsoTimestamp } from "../shared/utils/format.js";
import type { ValidationRecord } from "../validation/index.js";
import type { JobRecord, JobSnapshot, TaskStatus } from "./types.js";

export const jobFeature = {
  name: "job"
} as const;

export interface CreateJobOptions {
  title: string;
  agent: SupportedAgent;
  workspacePath?: string;
  stateDirectoryPath?: string;
  inputDocuments: string[];
  validateCommands?: string[];
  maxRetriesPerTask?: number;
  cwd?: string;
}

export interface LoadJobOptions {
  jobId?: string;
  workspacePath?: string;
  stateDirectoryPath?: string;
  cwd?: string;
}

export interface CreatedJob {
  snapshot: JobSnapshot;
  paths: ReturnType<typeof getJobPaths>;
}

export interface JobDetails {
  snapshot: JobSnapshot;
  finalSummary: string | null;
  userChecks: string | null;
  latestAgentResult: AgentResult | null;
  latestRunRecord: RalphRunRecord | null;
  latestValidation: ValidationRecord | null;
}

export async function createJob(options: CreateJobOptions): Promise<CreatedJob> {
  const cwd = options.cwd ?? process.cwd();
  const workspacePath = resolveWorkspacePath(options.workspacePath, cwd);
  const stateDirectoryPath = resolveStateDirectoryPath({
    workspacePath,
    stateDirectoryPath: options.stateDirectoryPath,
    cwd
  });
  const jobId = buildJobId(options.title);
  const paths = getJobPaths(jobId, stateDirectoryPath);

  const planningResult = await createInitialPlan({
    title: options.title,
    workspacePath,
    inputDocuments: options.inputDocuments,
    cwd
  });

  const timestamp = toIsoTimestamp();
  const job: JobRecord = {
    id: jobId,
    title: options.title,
    requestedAgent: options.agent,
    status: "planned",
    workspacePath,
    stateDirectoryPath,
    inputDocuments: planningResult.normalizedInputDocuments,
    validationProfile: {
      name: options.validateCommands !== undefined && options.validateCommands.length > 0 ? "commands" : "default",
      commands: options.validateCommands ?? []
    },
    retryPolicy: {
      maxRetriesPerTask: options.maxRetriesPerTask ?? 1
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await ensureJobDirectories(paths);
  await Promise.all([
    atomicWriteJson(paths.jobJsonPath, job),
    atomicWriteJson(paths.inputsJsonPath, planningResult.normalizedInputDocuments),
    atomicWriteJson(paths.tasksJsonPath, planningResult.tasks),
    atomicWriteJson(paths.runtimeJsonPath, planningResult.runtime),
    atomicWriteFile(paths.specMarkdownPath, planningResult.specMarkdown),
    atomicWriteFile(paths.planMarkdownPath, planningResult.planMarkdown),
    atomicWriteFile(paths.userChecksPath, "# User Checks\n\n"),
    atomicWriteFile(paths.finalSummaryPath, "# Final Summary\n\nPending.\n"),
    atomicWriteFile(paths.currentJobPath, `${jobId}\n`)
  ]);

  return {
    snapshot: {
      job,
      tasks: planningResult.tasks,
      runtime: planningResult.runtime
    },
    paths
  };
}

export async function loadJob(options: LoadJobOptions): Promise<JobSnapshot> {
  const cwd = options.cwd ?? process.cwd();
  const stateDirectoryPath = resolveStateDirectoryPath({
    workspacePath: options.workspacePath,
    stateDirectoryPath: options.stateDirectoryPath,
    cwd
  });

  const currentJobId = options.jobId ?? (await loadCurrentJobId(stateDirectoryPath));

  if (currentJobId === undefined) {
    throw new Error(
      `No job id was provided and no current job exists under ${stateDirectoryPath}.`
    );
  }

  const paths = getJobPaths(currentJobId, stateDirectoryPath);
  const [job, tasks, runtime] = await Promise.all([
    readJsonFile<JobRecord>(paths.jobJsonPath),
    readJsonFile<JobSnapshot["tasks"]>(paths.tasksJsonPath),
    readJsonFile<JobSnapshot["runtime"]>(paths.runtimeJsonPath)
  ]);

  if (job === undefined || tasks === undefined || runtime === undefined) {
    throw new Error(`Job ${currentJobId} was not found under ${stateDirectoryPath}.`);
  }

  return { job, tasks, runtime };
}

export async function saveJobSnapshot(snapshot: JobSnapshot): Promise<void> {
  const paths = getJobPaths(snapshot.job.id, snapshot.job.stateDirectoryPath);
  await Promise.all([
    atomicWriteJson(paths.jobJsonPath, snapshot.job),
    atomicWriteJson(paths.tasksJsonPath, snapshot.tasks),
    atomicWriteJson(paths.runtimeJsonPath, snapshot.runtime)
  ]);
}

export async function cancelJob(options: LoadJobOptions): Promise<JobSnapshot> {
  const snapshot = await loadJob(options);
  const updatedTasks = snapshot.tasks.tasks.map((task) =>
    isTerminalTaskStatus(task.status)
      ? task
      : {
          ...task,
          status: "cancelled" as const
        }
  );
  const nextSnapshot: JobSnapshot = {
    job: {
      ...snapshot.job,
      status: "cancelled",
      updatedAt: toIsoTimestamp()
    },
    tasks: {
      ...snapshot.tasks,
      tasks: updatedTasks,
      phaseGateStatus: derivePhaseGateStatus(snapshot.tasks.phases.map((phase) => phase.id), updatedTasks)
    },
    runtime: {
      ...snapshot.runtime,
      currentTaskId: null,
      remainingTaskCount: 0,
      nextAction: "none",
      blockedReason: "Cancelled by user.",
      lastValidationStatus: snapshot.runtime.lastValidationStatus
    }
  };

  await saveJobSnapshot(nextSnapshot);
  return nextSnapshot;
}

export async function loadJobDetails(options: LoadJobOptions): Promise<JobDetails> {
  const snapshot = await loadJob(options);
  const paths = getJobPaths(snapshot.job.id, snapshot.job.stateDirectoryPath);
  const finalSummary = (await readTextFile(paths.finalSummaryPath)) ?? null;
  const userChecks = (await readTextFile(paths.userChecksPath)) ?? null;

  if (snapshot.runtime.lastRunId === null) {
    return {
      snapshot,
      finalSummary,
      userChecks,
      latestAgentResult: null,
      latestRunRecord: null,
      latestValidation: null
    };
  }

  const runPaths = getRunPaths(paths.runsDirectoryPath, snapshot.runtime.lastRunId);
  const validationIndex = Number.parseInt(snapshot.runtime.lastRunId.replace("run-", ""), 10);
  const validationPath = getValidationPath(paths.validationsDirectoryPath, validationIndex);

  const [latestAgentResult, latestRunRecord, latestValidation] = await Promise.all([
    readJsonFile<AgentResult>(runPaths.resultPath),
    readJsonFile<RalphRunRecord>(runPaths.runRecordPath),
    readJsonFile<ValidationRecord>(validationPath)
  ]);

  return {
    snapshot,
    finalSummary,
    userChecks,
    latestAgentResult: latestAgentResult ?? null,
    latestRunRecord: latestRunRecord ?? null,
    latestValidation: latestValidation ?? null
  };
}

export async function getJobOverview(options: LoadJobOptions): Promise<{
  snapshot: JobSnapshot;
  runIds: string[];
}> {
  const snapshot = await loadJob(options);
  const paths = getJobPaths(snapshot.job.id, snapshot.job.stateDirectoryPath);
  const runIds = (await listDirectoryEntries(paths.runsDirectoryPath)).sort();
  return { snapshot, runIds };
}

async function loadCurrentJobId(
  stateDirectoryPath: string
): Promise<string | undefined> {
  const content = await readTextFile(getJobPaths("placeholder", stateDirectoryPath).currentJobPath);
  return content?.trim() || undefined;
}

function buildJobId(title: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `job-${datePart}-${slugify(title)}-${randomPart}`;
}

function isTerminalTaskStatus(status: TaskStatus): boolean {
  return ["completed", "partial", "blocked", "failed", "cancelled"].includes(status);
}

function derivePhaseGateStatus(
  phaseIds: string[],
  tasks: JobSnapshot["tasks"]["tasks"]
): JobSnapshot["tasks"]["phaseGateStatus"] {
  return Object.fromEntries(
    phaseIds.map((phaseId) => {
      const phaseTasks = tasks.filter((task) => task.phaseId === phaseId);

      if (phaseTasks.some((task) => ["failed", "blocked"].includes(task.status))) {
        return [phaseId, "failed"];
      }

      if (phaseTasks.length > 0 && phaseTasks.every((task) => task.status === "completed")) {
        return [phaseId, "passed"];
      }

      return [phaseId, "pending"];
    })
  );
}
