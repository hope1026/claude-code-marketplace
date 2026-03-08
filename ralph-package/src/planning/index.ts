import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  InputDocumentKind,
  InputDocumentRecord,
  PhaseRecord,
  RuntimeRecord,
  TaskRecord,
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

  const planModel = createDefaultPlanningModel({
    title: input.title,
    workspacePath: input.workspacePath,
    inputDocuments: normalizedInputDocuments
  });

  return {
    normalizedInputDocuments,
    specMarkdown: buildSpecMarkdown(input.title, input.workspacePath, normalizedInputDocuments),
    planMarkdown: buildPlanMarkdown(input.title, planModel, normalizedInputDocuments),
    tasks: {
      phases: planModel.phases,
      tasks: planModel.tasks,
      dependencies: planModel.dependencies,
      retryCounts: Object.fromEntries(planModel.tasks.map((task) => [task.id, 0])),
      evidenceLinks: Object.fromEntries(planModel.tasks.map((task) => [task.id, []])),
      phaseGateStatus: Object.fromEntries(planModel.phases.map((phase) => [phase.id, "pending"]))
    },
    runtime: {
      currentPhaseId: planModel.phases[0]?.id ?? null,
      currentTaskId: planModel.tasks[0]?.id ?? null,
      remainingTaskCount: planModel.tasks.length,
      lastRunId: null,
      nextAction: "resume",
      blockedReason: null,
      lastValidationStatus: "pending"
    }
  };
}

function buildSpecMarkdown(
  title: string,
  workspacePath: string,
  inputDocuments: InputDocumentRecord[]
): string {
  const sections = ["# Job Spec", "", `Title: ${title}`, "", `Workspace: ${workspacePath}`, ""];

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

function buildPlanMarkdown(
  title: string,
  planModel: {
    phases: PhaseRecord[];
    tasks: TaskRecord[];
    dependencies: Record<string, string[]>;
  },
  inputDocuments: InputDocumentRecord[]
): string {
  const lines = [
    "# Plan",
    "",
    `Job title: ${title}`,
    ""
  ];

  for (const phase of planModel.phases) {
    lines.push(`## ${phase.id} ${phase.title}`, "");

    const phaseTasks = planModel.tasks.filter((task) => task.phaseId === phase.id);

    if (phaseTasks.length === 0) {
      lines.push("No tasks.", "");
      continue;
    }

    for (const task of phaseTasks) {
      const dependencies = planModel.dependencies[task.id] ?? [];
      lines.push(`- ${task.id}: ${task.title}`);
      lines.push(`  - ${task.description}`);
      lines.push(
        dependencies.length === 0
          ? "  - Dependencies: none"
          : `  - Dependencies: ${dependencies.join(", ")}`
      );
    }

    lines.push("");
  }

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

function createDefaultPlanningModel(input: {
  title: string;
  workspacePath: string;
  inputDocuments: InputDocumentRecord[];
}): {
  phases: PhaseRecord[];
  tasks: TaskRecord[];
  dependencies: Record<string, string[]>;
} {
  const phaseId = "PHASE-001";
  const taskId = "TASK-001";
  const inputSummary =
    input.inputDocuments.length === 0
      ? "Use the workspace state as the primary source of truth."
      : `Inspect ${input.inputDocuments.length} referenced input path(s) before making changes.`;

  return {
    phases: [
      {
        id: phaseId,
        title: "Requested Work"
      }
    ],
    tasks: [
      {
        id: taskId,
        phaseId,
        title: input.title,
        description: `${input.title}. ${inputSummary}`,
        status: "pending"
      }
    ],
    dependencies: {
      [taskId]: []
    }
  };
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
