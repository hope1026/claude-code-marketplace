import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  InputDocumentKind,
  InputDocumentRecord,
  RuntimeRecord,
  TasksRecord
} from "../job/types.js";

export const planningFeature = {
  name: "planning"
} as const;

export interface PlanningInput {
  title: string;
  workspacePath: string;
  inputDocuments: string[];
  cwd?: string;
}

export interface PlanningResult {
  normalizedInputDocuments: InputDocumentRecord[];
  specMarkdown: string;
  planMarkdown: string;
  tasks: TasksRecord;
  runtime: RuntimeRecord;
}

export async function createInitialPlan(
  input: PlanningInput
): Promise<PlanningResult> {
  const normalizedInputDocuments = await Promise.all(
    input.inputDocuments.map(async (documentPath) => {
      const resolvedPath = resolve(input.cwd ?? process.cwd(), documentPath);
      const fileStat = await stat(resolvedPath);

      return {
        path: resolvedPath,
        kind: detectInputDocumentKind(resolvedPath, fileStat.isDirectory())
      };
    })
  );

  const phaseId = "PHASE-001";
  const taskId = "TASK-001";

  return {
    normalizedInputDocuments,
    specMarkdown: buildSpecMarkdown(input.title, normalizedInputDocuments),
    planMarkdown: buildPlanMarkdown(input.title, normalizedInputDocuments),
    tasks: {
      phases: [
        {
          id: phaseId,
          title: "Initial Execution"
        }
      ],
      tasks: [
        {
          id: taskId,
          phaseId,
          title: input.title,
          description: "Execute the requested job against the provided workspace.",
          status: "pending"
        }
      ],
      dependencies: {
        [taskId]: []
      },
      retryCounts: {
        [taskId]: 0
      },
      evidenceLinks: {
        [taskId]: []
      },
      phaseGateStatus: {
        [phaseId]: "pending"
      }
    },
    runtime: {
      currentPhaseId: phaseId,
      currentTaskId: taskId,
      remainingTaskCount: 1,
      lastRunId: null,
      nextAction: "resume",
      blockedReason: null,
      lastValidationStatus: "pending"
    }
  };
}

function buildSpecMarkdown(title: string, inputDocuments: InputDocumentRecord[]): string {
  const sections = [`# Job Spec`, "", `Title: ${title}`, ""];

  if (inputDocuments.length === 0) {
    sections.push("No input documents were provided.");
    sections.push("");
  } else {
    sections.push("Referenced inputs:", "");
    sections.push(
      ...inputDocuments.map((document) => `- [${document.kind}] ${document.path}`),
      "",
      "Ralph passes these paths to the agent as references.",
      "The agent must inspect the files directly instead of relying on copied content.",
      ""
    );
  }

  return `${sections.join("\n").trimEnd()}\n`;
}

function buildPlanMarkdown(title: string, inputDocuments: InputDocumentRecord[]): string {
  const lines = [
    "# Plan",
    "",
    `Job title: ${title}`,
    "",
    "## Initial phase",
    "",
    "1. Review the workspace and provided inputs.",
    "2. Execute the first task in a fresh agent context.",
    "3. Persist run artifacts and validation state."
  ];

  if (inputDocuments.length > 0) {
    lines.push(
      "",
      "## Inputs",
      "",
      ...inputDocuments.map((value) => `- [${value.kind}] ${value.path}`)
    );
  }

  return `${lines.join("\n")}\n`;
}

function detectInputDocumentKind(
  documentPath: string,
  isDirectory: boolean
): InputDocumentKind {
  if (isDirectory) {
    return "directory";
  }

  const normalizedPath = documentPath.toLowerCase();

  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((extension) =>
      normalizedPath.endsWith(extension)
    )
  ) {
    return "image";
  }

  if (normalizedPath.includes(".")) {
    return "file";
  }

  return "unknown";
}
