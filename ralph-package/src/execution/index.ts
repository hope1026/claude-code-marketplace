import {
  getAdapterDefinition,
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
  TaskRecord
} from "../job/types.js";
import {
  buildBlockedRuntime,
  buildNoRunnableTaskReason,
  countRemainingTasks,
  derivePhaseGateStatus,
  isJobTerminal,
  isTaskTerminal,
  nextPendingTaskId,
  selectRunnableTask
} from "../job/rules.js";
import { updateFinalSummaryReport, updateUserChecksReport } from "../reporting/index.js";
import {
  atomicWriteFile,
  atomicWriteJson,
  ensureRunDirectory,
  getJobPaths,
  getNextRunId,
  getRunPaths
} from "../state/index.js";
import { applyValidationOutcome, runValidation } from "../validation/index.js";

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
  runRecord: RalphRunRecord | null;
  runRecords: RalphRunRecord[];
  runDirectoryPath: string | null;
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
      snapshot = await blockJobOnNoRunnableTask(snapshot);
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

  if (runRecords.length === 0 && snapshot.job.status !== "blocked") {
    throw new Error(`Job ${snapshot.job.id} has no runnable task.`);
  }

  return {
    snapshot,
    runRecord: runRecords.at(-1) ?? null,
    runRecords,
    runDirectoryPath: lastRunDirectoryPath || null,
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
  const adapter = getAdapterDefinition(snapshot.job.requestedAgent);
  const promptText = adapter.preparePrompt({
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

    const agentResult = parseAgentResult(adapterResult.rawResultText);

    if (agentResult.task_id !== runnableTask.id) {
      throw {
        code: "malformed_result",
        message: `Agent returned task_id ${agentResult.task_id}, expected ${runnableTask.id}.`,
        stdout: adapterResult.stdout,
        stderr: adapterResult.stderr,
        exitCode: adapterResult.exitCode,
        signal: adapterResult.signal
      } satisfies AdapterExecutionFailure;
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

    const normalizedResult = applyValidationOutcome(agentResult, validationRecord);

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
        jobStatus: nextSnapshot.job.status,
        runsDirectoryPath: paths.runsDirectoryPath
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
      jobStatus: nextSnapshot.job.status,
      runsDirectoryPath: paths.runsDirectoryPath
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
      targetTask.status = "completed";
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

  const phaseGateStatus = derivePhaseGateStatus(snapshot.tasks.phases, nextTasks);
  const remainingTaskCount = countRemainingTasks(nextTasks);
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
  const currentTaskId = nextPendingTaskId(snapshot.tasks.phases, nextTasks, nextDependencies);
  const currentPhaseId =
    currentTaskId === null
      ? snapshot.tasks.phases.find((phase) => phaseGateStatus[phase.id] !== "passed")?.id ?? null
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

function isTerminalJobStatus(status: JobSnapshot["job"]["status"]): boolean {
  return isJobTerminal(status);
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
      remainingTaskCount: countRemainingTasks(nextTasks),
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

async function blockJobOnNoRunnableTask(snapshot: JobSnapshot): Promise<JobSnapshot> {
  const reason = buildNoRunnableTaskReason(snapshot);
  const paths = getJobPaths(snapshot.job.id, snapshot.job.stateDirectoryPath);
  const nextSnapshot: JobSnapshot = {
    job: {
      ...snapshot.job,
      status: "blocked",
      updatedAt: new Date().toISOString()
    },
    tasks: {
      ...snapshot.tasks,
      phaseGateStatus: derivePhaseGateStatus(snapshot.tasks.phases, snapshot.tasks.tasks)
    },
    runtime: {
      ...buildBlockedRuntime(snapshot, reason),
      lastValidationStatus: snapshot.runtime.lastValidationStatus
    }
  };

  await saveJobSnapshot(nextSnapshot);
  await updateFinalSummaryReport({
    finalSummaryPath: paths.finalSummaryPath,
    title: snapshot.job.title,
    jobStatus: nextSnapshot.job.status,
    runsDirectoryPath: paths.runsDirectoryPath
  });
  return nextSnapshot;
}
