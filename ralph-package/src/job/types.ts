import type { SupportedAgent } from "../adapters/index.js";

export type JobStatus =
  | "draft"
  | "planned"
  | "running"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial"
  | "blocked"
  | "failed"
  | "cancelled";

export type PhaseGateStatus = "pending" | "failed" | "passed";
export type ValidationStatus = "pending" | "failed" | "passed";
export type InputDocumentKind = "file" | "image" | "directory" | "unknown";

export interface InputDocumentRecord {
  path: string;
  kind: InputDocumentKind;
}

export interface JobRecord {
  id: string;
  title: string;
  requestedAgent: SupportedAgent;
  status: JobStatus;
  workspacePath: string;
  stateDirectoryPath: string;
  inputDocuments: InputDocumentRecord[];
  validationProfile: {
    name: string;
    commands: string[];
  };
  retryPolicy: {
    maxRetriesPerTask: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PhaseRecord {
  id: string;
  title: string;
}

export interface TaskRecord {
  id: string;
  phaseId: string;
  title: string;
  description: string;
  status: TaskStatus;
  sourceTaskId?: string;
}

export interface TasksRecord {
  phases: PhaseRecord[];
  tasks: TaskRecord[];
  dependencies: Record<string, string[]>;
  retryCounts: Record<string, number>;
  evidenceLinks: Record<string, string[]>;
  phaseGateStatus: Record<string, PhaseGateStatus>;
}

export interface RuntimeRecord {
  currentPhaseId: string | null;
  currentTaskId: string | null;
  remainingTaskCount: number;
  lastRunId: string | null;
  nextAction: "resume" | "none" | "blocked";
  blockedReason: string | null;
  lastValidationStatus: ValidationStatus;
}

export interface JobSnapshot {
  job: JobRecord;
  tasks: TasksRecord;
  runtime: RuntimeRecord;
}
