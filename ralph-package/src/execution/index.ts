import { buildExecutionPrompt } from "../adapters/prompts.js";
import {
  createAdapterFailure,
  parseAgentResult,
  persistRunLogs,
  runAdapter
} from "../adapters/index.js";
import type {
  AdapterErrorCode,
  AdapterExecutionFailure,
  AgentResult,
  RalphRunRecord
} from "../adapters/index.js";
import { loadJob, saveJobSnapshot } from "../job/index.js";
import type {
  JobSnapshot,
  TaskRecord,
  TaskStatus
} from "../job/types.js";
import { updateFinalSummaryReport, updateUserChecksReport } from "../reporting/index.js";
import {
  atomicWriteFile,
  atomicWriteJson,
  ensureRunDirectory,
  getJobPaths,
  getNextRunId,
  getRunPaths
} from "../state/index.js";
import { runValidation } from "../validation/index.js";

export const executionFeature = {
  name: "execution"
} as const;

export interface ResumeJobOptions {
  jobId?: string;
  workspacePath?: string;
  stateDirectoryPath?: string;
  maxIterations?: number;
  cwd?: string;
}

export interface ResumeJobResult {
  snapshot: JobSnapshot;
  runRecord: RalphRunRecord;
  runRecords: RalphRunRecord[];
  runDirectoryPath: string;
  iterations: number;
}

interface IterationResult {
  snapshot: JobSnapshot;
  runRecord: RalphRunRecord;
  runDirectoryPath: string;
}

export async function resumeJob(
  options: ResumeJobOptions
): Promise<ResumeJobResult> {
  const maxIterations = options.maxIterations ?? Number.POSITIVE_INFINITY;
  let snapshot = await loadJob(options);
  const runRecords: RalphRunRecord[] = [];
  let lastRunDirectoryPath = "";

  if (isTerminalJobStatus(snapshot.job.status)) {
    throw new Error(`Job ${snapshot.job.id} is already ${snapshot.job.status}.`);
  }

  while (runRecords.length < maxIterations) {
    const runnableTask = selectRunnableTask(snapshot);

    if (runnableTask === undefined) {
      break;
    }

    const iterationResult = await executeIteration(snapshot, runnableTask);
    snapshot = iterationResult.snapshot;
    runRecords.push(iterationResult.runRecord);
    lastRunDirectoryPath = iterationResult.runDirectoryPath;

    if (snapshot.runtime.nextAction !== "resume") {
      break;
    }
  }

  if (runRecords.length === 0) {
    throw new Error(`Job ${snapshot.job.id} has no runnable task.`);
  }

  return {
    snapshot,
    runRecord: runRecords.at(-1)!,
    runRecords,
    runDirectoryPath: lastRunDirectoryPath,
    iterations: runRecords.length
  };
}

async function executeIteration(
  snapshot: JobSnapshot,
  runnableTask: TaskRecord
): Promise<IterationResult> {
  const paths = getJobPaths(snapshot.job.id, snapshot.job.stateDirectoryPath);
  const runId = getNextRunId(snapshot.runtime.lastRunId);
  const runPaths = getRunPaths(paths.runsDirectoryPath, runId);
  const promptText = buildExecutionPrompt({
    title: snapshot.job.title,
    taskId: runnableTask.id,
    taskTitle: runnableTask.title,
    taskDescription: runnableTask.description,
    workspacePath: snapshot.job.workspacePath,
    specPath: paths.specMarkdownPath,
    planPath: paths.planMarkdownPath,
    inputManifestPath: paths.inputsJsonPath,
    inputDocuments: snapshot.job.inputDocuments
  });

  await ensureRunDirectory(runPaths.runDirectoryPath);
  const startedAt = new Date().toISOString();
  const runningSnapshot = buildRunningSnapshot(snapshot, runnableTask, runId);
  const runningRunRecord = buildRunningRunRecord({
    runId,
    taskId: runnableTask.id,
    agent: snapshot.job.requestedAgent,
    startedAt
  });

  await Promise.all([
    atomicWriteFile(runPaths.promptPath, promptText),
    atomicWriteFile(runPaths.stdoutLogPath, ""),
    atomicWriteFile(runPaths.stderrLogPath, ""),
    atomicWriteJson(runPaths.runRecordPath, runningRunRecord),
    saveJobSnapshot(runningSnapshot)
  ]);

  try {
    const adapterResult = await runAdapter({
      agent: runningSnapshot.job.requestedAgent,
      workspacePath: runningSnapshot.job.workspacePath,
      promptPath: runPaths.promptPath,
      promptText,
      outputPath: runPaths.outputPath,
      runDirectoryPath: runPaths.runDirectoryPath
    });

    await persistRunLogs(buildRunContext(runningSnapshot, runPaths, promptText), adapterResult);

    if (adapterResult.exitCode !== 0) {
      throw createAdapterFailure(
        "execution_failed",
        "Agent process exited with a non-zero status.",
        {
          stdout: adapterResult.stdout,
          stderr: adapterResult.stderr,
          exitCode: adapterResult.exitCode,
          signal: adapterResult.signal
        }
      );
    }

    const agentResult = parseAgentResult(adapterResult.rawResultText);

    if (agentResult.task_id !== runnableTask.id) {
      throw createAdapterFailure(
        "malformed_result",
        `Agent returned task_id ${agentResult.task_id}, expected ${runnableTask.id}.`,
        {
          stdout: adapterResult.stdout,
          stderr: adapterResult.stderr,
          exitCode: adapterResult.exitCode,
          signal: adapterResult.signal
        }
      );
    }

    const validationRecord = await runValidation({
      jobId: runningSnapshot.job.id,
      taskId: runnableTask.id,
      validationHints: agentResult.validation_hints,
      workspacePath: runningSnapshot.job.workspacePath,
      commands: runningSnapshot.job.validationProfile.commands,
      validationsDirectoryPath: paths.validationsDirectoryPath,
      validationIndex: toRunNumber(runId)
    });

    const normalizedResult =
      validationRecord.status === "failed"
        ? {
            ...agentResult,
            status: "failed" as const,
            blockers: [
              ...agentResult.blockers,
              validationRecord.summary
            ]
          }
        : agentResult;

    const runRecord = buildRunRecord({
      runId,
      taskId: runnableTask.id,
      agent: runningSnapshot.job.requestedAgent,
      startedAt,
      finishedAt: new Date().toISOString(),
      result: normalizedResult,
      exitCode: adapterResult.exitCode,
      signal: adapterResult.signal
    });

    await Promise.all([
      atomicWriteJson(runPaths.resultPath, normalizedResult),
      atomicWriteJson(runPaths.runRecordPath, runRecord)
    ]);

    const nextSnapshot = applyTaskOutcome({
      snapshot: runningSnapshot,
      task: runnableTask,
      runId,
      runRecord,
      result: normalizedResult,
      validationStatus: validationRecord.status
    });

    await saveJobSnapshot(nextSnapshot);
    await Promise.all([
      updateUserChecksReport(paths.userChecksPath, collectUserChecks(nextSnapshot, runRecord)),
      updateFinalSummaryReport({
        finalSummaryPath: paths.finalSummaryPath,
        title: runningSnapshot.job.title,
        runRecord
      })
    ]);

    return {
      snapshot: nextSnapshot,
      runRecord,
      runDirectoryPath: runPaths.runDirectoryPath
    };
  } catch (error) {
    const failure = normalizeExecutionFailure(error);
    await persistRunLogs(buildRunContext(runningSnapshot, runPaths, promptText), failure);

    const failedResult: AgentResult = {
      status: "failed",
      task_id: runnableTask.id,
      summary: failure.message,
      changed_files: [],
      artifacts: [],
      follow_up_tasks: [],
      user_checks: [],
      validation_hints: [],
      blockers: failure.code === "cli_missing" ? [failure.message] : []
    };
    const runRecord = buildRunRecord({
      runId,
      taskId: runnableTask.id,
      agent: runningSnapshot.job.requestedAgent,
      startedAt,
      finishedAt: new Date().toISOString(),
      result: failedResult,
      exitCode: failure.exitCode,
      signal: failure.signal,
      errorCode: failure.code
    });

    await Promise.all([
      atomicWriteJson(runPaths.resultPath, failedResult),
      atomicWriteJson(runPaths.runRecordPath, runRecord)
    ]);

    const nextSnapshot = applyTaskOutcome({
      snapshot: runningSnapshot,
      task: runnableTask,
      runId,
      runRecord,
      result: failedResult,
      validationStatus: "failed",
      failureCode: failure.code
    });

    await saveJobSnapshot(nextSnapshot);
    await updateFinalSummaryReport({
      finalSummaryPath: paths.finalSummaryPath,
      title: runningSnapshot.job.title,
      runRecord
    });

    return {
      snapshot: nextSnapshot,
      runRecord,
      runDirectoryPath: runPaths.runDirectoryPath
    };
  }
}

function buildRunContext(
  snapshot: JobSnapshot,
  runPaths: ReturnType<typeof getRunPaths>,
  promptText: string
) {
  return {
    agent: snapshot.job.requestedAgent,
    workspacePath: snapshot.job.workspacePath,
    promptPath: runPaths.promptPath,
    promptText,
    outputPath: runPaths.outputPath,
    runDirectoryPath: runPaths.runDirectoryPath
  };
}

function applyTaskOutcome(options: {
  snapshot: JobSnapshot;
  task: TaskRecord;
  runId: string;
  runRecord: RalphRunRecord;
  result: AgentResult;
  validationStatus: "passed" | "failed";
  failureCode?: AdapterErrorCode;
}): JobSnapshot {
  const { snapshot, task, runId, runRecord, result } = options;
  const nextRetryCounts = {
    ...snapshot.tasks.retryCounts
  };
  const nextEvidenceLinks = {
    ...snapshot.tasks.evidenceLinks,
    [task.id]: [...(snapshot.tasks.evidenceLinks[task.id] ?? []), runId]
  };
  const nextDependencies = Object.fromEntries(
    Object.entries(snapshot.tasks.dependencies).map(([key, value]) => [key, [...value]])
  );
  const nextTasks = snapshot.tasks.tasks.map((entry) =>
    entry.id === task.id ? { ...entry } : entry
  );
  const targetTask = nextTasks.find((entry) => entry.id === task.id)!;
  const canRetry = nextRetryCounts[task.id] < snapshot.job.retryPolicy.maxRetriesPerTask;

  if (result.status === "completed") {
    targetTask.status = "completed";
  } else if (result.status === "partial") {
    if (result.follow_up_tasks.length > 0) {
      targetTask.status = "partial";
      appendFollowUpTasks({
        dependencies: nextDependencies,
        nextTasks,
        nextRetryCounts,
        nextEvidenceLinks,
        sourceTask: task,
        followUpTasks: result.follow_up_tasks
      });
    } else if (canRetry) {
      targetTask.status = "pending";
      nextRetryCounts[task.id] += 1;
    } else {
      targetTask.status = "blocked";
      result.blockers = [
        ...result.blockers,
        "Partial result exhausted retry budget without follow-up tasks."
      ];
    }
  } else if (result.status === "failed") {
    if (canRetry) {
      targetTask.status = "pending";
      nextRetryCounts[task.id] += 1;
    } else {
      targetTask.status = options.failureCode === "malformed_result" ? "blocked" : "failed";
    }
  } else if (result.status === "blocked") {
    targetTask.status = "blocked";
  }

  if (result.status === "completed" && result.follow_up_tasks.length > 0) {
    appendFollowUpTasks({
      dependencies: nextDependencies,
      nextTasks,
      nextRetryCounts,
      nextEvidenceLinks,
      sourceTask: task,
      followUpTasks: result.follow_up_tasks
    });
  }

  const remainingTaskCount = nextTasks.filter((entry) => entry.status === "pending").length;
  const phaseGateStatus = derivePhaseGateStatus(snapshot, nextTasks);
  const blockedReason =
    nextTasks.some((entry) => entry.status === "blocked")
      ? result.blockers.join("; ") || runRecord.summary
      : null;
  const hasFailedTask = nextTasks.some((entry) => entry.status === "failed");
  const allRequiredWorkCompleted =
    nextTasks.length > 0 &&
    nextTasks.every((entry) => entry.status === "completed");
  const allPhaseGatesPassed =
    Object.values(phaseGateStatus).length > 0 &&
    Object.values(phaseGateStatus).every((status) => status === "passed");
  const nextAction = blockedReason !== null ? "blocked" : remainingTaskCount > 0 ? "resume" : "none";
  const nextJobStatus =
    blockedReason !== null
      ? "blocked"
      : hasFailedTask
        ? "failed"
        : remainingTaskCount === 0 && allRequiredWorkCompleted && allPhaseGatesPassed
          ? "completed"
          : "running";
  const currentTaskId = nextPendingTaskId(nextTasks, nextDependencies);
  const currentPhaseId =
    currentTaskId === null
      ? snapshot.runtime.currentPhaseId
      : nextTasks.find((entry) => entry.id === currentTaskId)?.phaseId ?? snapshot.runtime.currentPhaseId;

  return {
    job: {
      ...snapshot.job,
      status: nextJobStatus,
      updatedAt: new Date().toISOString()
    },
    tasks: {
      ...snapshot.tasks,
      tasks: nextTasks,
      dependencies: nextDependencies,
      retryCounts: nextRetryCounts,
      evidenceLinks: nextEvidenceLinks,
      phaseGateStatus
    },
    runtime: {
      ...snapshot.runtime,
      currentPhaseId,
      currentTaskId,
      remainingTaskCount,
      lastRunId: runId,
      nextAction,
      blockedReason,
      lastValidationStatus: options.validationStatus
    }
  };
}

function appendFollowUpTasks(options: {
  dependencies: Record<string, string[]>;
  nextTasks: TaskRecord[];
  nextRetryCounts: Record<string, number>;
  nextEvidenceLinks: Record<string, string[]>;
  sourceTask: TaskRecord;
  followUpTasks: string[];
}): void {
  const nextTaskNumber = options.nextTasks.length + 1;

  options.followUpTasks.forEach((followUpTask, index) => {
    const taskId = `TASK-${String(nextTaskNumber + index).padStart(3, "0")}`;
    options.nextTasks.push({
      id: taskId,
      phaseId: options.sourceTask.phaseId,
      title: followUpTask,
      description: followUpTask,
      status: "pending",
      sourceTaskId: options.sourceTask.id
    });
    options.dependencies[taskId] = [options.sourceTask.id];
    options.nextRetryCounts[taskId] = 0;
    options.nextEvidenceLinks[taskId] = [];
  });
}

function selectRunnableTask(snapshot: JobSnapshot): TaskRecord | undefined {
  return snapshot.tasks.tasks.find((task) => {
    if (task.status !== "pending") {
      return false;
    }

    const dependencies = snapshot.tasks.dependencies[task.id] ?? [];
    return dependencies.every((dependencyId) => {
      const dependency = snapshot.tasks.tasks.find((entry) => entry.id === dependencyId);
      return dependency !== undefined && isTerminalTaskStatus(dependency.status);
    });
  });
}

function buildRunRecord(options: {
  runId: string;
  taskId: string;
  agent: string;
  startedAt: string;
  finishedAt: string | null;
  result: AgentResult;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  errorCode?: AdapterErrorCode;
}): RalphRunRecord {
  return {
    runId: options.runId,
    taskId: options.taskId,
    agent: options.agent,
    startedAt: options.startedAt,
    finishedAt: options.finishedAt,
    status: options.result.status,
    summary: options.result.summary,
    changedFiles: options.result.changed_files,
    blockers: options.result.blockers,
    userChecks: options.result.user_checks,
    validationHints: options.result.validation_hints,
    artifacts: options.result.artifacts,
    followUpTasks: options.result.follow_up_tasks,
    exitCode: options.exitCode,
    signal: options.signal,
    errorCode: options.errorCode
  };
}

function buildRunningRunRecord(options: {
  runId: string;
  taskId: string;
  agent: string;
  startedAt: string;
}): RalphRunRecord {
  return {
    runId: options.runId,
    taskId: options.taskId,
    agent: options.agent,
    startedAt: options.startedAt,
    finishedAt: null,
    status: "running",
    summary: `Started ${options.taskId}.`,
    changedFiles: [],
    blockers: [],
    userChecks: [],
    validationHints: [],
    artifacts: [],
    followUpTasks: [],
    exitCode: null,
    signal: null
  };
}

function derivePhaseGateStatus(
  snapshot: JobSnapshot,
  tasks: TaskRecord[]
): JobSnapshot["tasks"]["phaseGateStatus"] {
  return Object.fromEntries(
    snapshot.tasks.phases.map((phase) => {
      const phaseTasks = tasks.filter((task) => task.phaseId === phase.id);

      if (phaseTasks.some((task) => ["failed", "blocked"].includes(task.status))) {
        return [phase.id, "failed"];
      }

      if (
        phaseTasks.length > 0 &&
        phaseTasks.every((task) => task.status === "completed")
      ) {
        return [phase.id, "passed"];
      }

      return [phase.id, "pending"];
    })
  );
}

function nextPendingTaskId(
  tasks: TaskRecord[],
  dependencies: Record<string, string[]>
): string | null {
  return (
    tasks.find((task) => {
      if (task.status !== "pending") {
        return false;
      }

      const taskDependencies = dependencies[task.id] ?? [];
      return taskDependencies.every((dependencyId) => {
        const dependency = tasks.find((entry) => entry.id === dependencyId);
        return dependency !== undefined && isTerminalTaskStatus(dependency.status);
      });
    })?.id ?? null
  );
}

function isTerminalTaskStatus(status: TaskStatus): boolean {
  return ["completed", "partial", "blocked", "failed", "cancelled"].includes(status);
}

function isTerminalJobStatus(status: JobSnapshot["job"]["status"]): boolean {
  return ["completed", "failed", "cancelled"].includes(status);
}

function buildRunningSnapshot(
  snapshot: JobSnapshot,
  task: TaskRecord,
  runId: string
): JobSnapshot {
  const nextTasks = snapshot.tasks.tasks.map((entry) =>
    entry.id === task.id
      ? {
          ...entry,
          status: "running" as const
        }
      : entry
  );

  return {
    job: {
      ...snapshot.job,
      status: "running",
      updatedAt: new Date().toISOString()
    },
    tasks: {
      ...snapshot.tasks,
      tasks: nextTasks
    },
    runtime: {
      ...snapshot.runtime,
      currentPhaseId: task.phaseId,
      currentTaskId: task.id,
      remainingTaskCount: nextTasks.filter((entry) => entry.status === "pending").length,
      lastRunId: runId,
      nextAction: "resume",
      blockedReason: null,
      lastValidationStatus: "pending"
    }
  };
}

function collectUserChecks(snapshot: JobSnapshot, runRecord: RalphRunRecord): string[] {
  return runRecord.userChecks;
}

function toRunNumber(runId: string): number {
  return Number.parseInt(runId.replace("run-", ""), 10);
}

function normalizeExecutionFailure(error: unknown): AdapterExecutionFailure {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "stdout" in error &&
    "stderr" in error
  ) {
    return error as AdapterExecutionFailure;
  }

  return {
    code: "execution_failed",
    message: error instanceof Error ? error.message : "Execution failed.",
    stdout: "",
    stderr: "",
    exitCode: null,
    signal: null
  };
}
