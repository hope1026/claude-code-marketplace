import type {
  JobSnapshot,
  JobStatus,
  PhaseGateStatus,
  PhaseRecord,
  RuntimeRecord,
  TaskRecord,
  TaskStatus
} from "./types.js";

export function isTaskCompleted(status: TaskStatus): boolean {
  return status === "completed";
}

export function isTaskTerminal(status: TaskStatus): boolean {
  return ["completed", "blocked", "failed", "cancelled"].includes(status);
}

export function isTaskRemaining(status: TaskStatus): boolean {
  return ["pending", "running", "partial"].includes(status);
}

export function isJobTerminal(status: JobStatus): boolean {
  return ["completed", "failed", "cancelled"].includes(status);
}

export function derivePhaseGateStatus(
  phases: PhaseRecord[],
  tasks: TaskRecord[]
): Record<string, PhaseGateStatus> {
  return Object.fromEntries(
    phases.map((phase) => {
      const phaseTasks = tasks.filter((task) => task.phaseId === phase.id);

      if (phaseTasks.some((task) => ["failed", "blocked"].includes(task.status))) {
        return [phase.id, "failed"];
      }

      if (phaseTasks.length > 0 && phaseTasks.every((task) => isTaskCompleted(task.status))) {
        return [phase.id, "passed"];
      }

      return [phase.id, "pending"];
    })
  );
}

export function selectRunnableTask(snapshot: JobSnapshot): TaskRecord | undefined {
  const activePhaseId = getActivePhaseId(snapshot.tasks.phases, snapshot.tasks.tasks);

  if (activePhaseId === null) {
    return undefined;
  }

  return snapshot.tasks.tasks.find((task) => {
    if (task.phaseId !== activePhaseId || task.status !== "pending") {
      return false;
    }

    return areTaskDependenciesSatisfied(task, snapshot.tasks.tasks, snapshot.tasks.dependencies);
  });
}

export function nextPendingTaskId(
  phases: PhaseRecord[],
  tasks: TaskRecord[],
  dependencies: Record<string, string[]>
): string | null {
  const activePhaseId = getActivePhaseId(phases, tasks);

  if (activePhaseId === null) {
    return null;
  }

  return (
    tasks.find((task) => {
      if (task.phaseId !== activePhaseId || task.status !== "pending") {
        return false;
      }

      return areTaskDependenciesSatisfied(task, tasks, dependencies);
    })?.id ?? null
  );
}

export function countRemainingTasks(tasks: TaskRecord[]): number {
  return tasks.filter((task) => isTaskRemaining(task.status)).length;
}

export function buildNoRunnableTaskReason(snapshot: JobSnapshot): string {
  const phaseGateStatus = derivePhaseGateStatus(snapshot.tasks.phases, snapshot.tasks.tasks);
  const activePhaseId = getActivePhaseId(snapshot.tasks.phases, snapshot.tasks.tasks);

  if (activePhaseId === null) {
    return "No runnable task is available.";
  }

  if (phaseGateStatus[activePhaseId] === "failed") {
    return `No runnable task is available because ${activePhaseId} has failed.`;
  }

  const pendingTasks = snapshot.tasks.tasks.filter(
    (task) => task.phaseId === activePhaseId && task.status === "pending"
  );
  const blockedDependencies = pendingTasks
    .map((task) => {
      const unmetDependencies = (snapshot.tasks.dependencies[task.id] ?? []).filter((dependencyId) => {
        const dependency = snapshot.tasks.tasks.find((entry) => entry.id === dependencyId);
        return dependency === undefined || !isTaskCompleted(dependency.status);
      });

      return unmetDependencies.length > 0 ? `${task.id} waits for ${unmetDependencies.join(", ")}` : null;
    })
    .filter((value): value is string => value !== null);

  if (blockedDependencies.length > 0) {
    return `No runnable task is available because dependencies are incomplete: ${blockedDependencies.join("; ")}.`;
  }

  return `No runnable task is available in ${activePhaseId}.`;
}

export function buildBlockedRuntime(snapshot: JobSnapshot, reason: string): RuntimeRecord {
  return {
    ...snapshot.runtime,
    currentTaskId: null,
    currentPhaseId: getActivePhaseId(snapshot.tasks.phases, snapshot.tasks.tasks),
    remainingTaskCount: countRemainingTasks(snapshot.tasks.tasks),
    nextAction: "blocked",
    blockedReason: reason
  };
}

function getActivePhaseId(phases: PhaseRecord[], tasks: TaskRecord[]): string | null {
  const phaseGateStatus = derivePhaseGateStatus(phases, tasks);

  for (const phase of phases) {
    if (phaseGateStatus[phase.id] === "passed") {
      continue;
    }

    return phase.id;
  }

  return null;
}

function areTaskDependenciesSatisfied(
  task: TaskRecord,
  tasks: TaskRecord[],
  dependencies: Record<string, string[]>
): boolean {
  const taskDependencies = dependencies[task.id] ?? [];

  return taskDependencies.every((dependencyId) => {
    const dependency = tasks.find((entry) => entry.id === dependencyId);
    return dependency !== undefined && isTaskCompleted(dependency.status);
  });
}
