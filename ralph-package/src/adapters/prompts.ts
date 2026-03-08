import type { InputDocumentRecord } from "../job/types.js";
import type { AdapterRunContext } from "./types.js";

export function buildExecutionPrompt(context: {
  title: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  workspacePath: string;
  specPath: string;
  planPath: string;
  inputManifestPath: string;
  inputDocuments: InputDocumentRecord[];
}): string {
  const lines = [
    "You are executing a single Ralph task in a fresh context.",
    "Return only a JSON object that matches the required schema.",
    "Do not wrap the JSON in markdown fences.",
    "",
    `Workspace: ${context.workspacePath}`,
    `Task ID: ${context.taskId}`,
    `Task Title: ${context.taskTitle}`,
    "",
    "Task Description:",
    context.taskDescription,
    "",
    "Execution Requirements:",
    "- Work only inside the provided workspace.",
    "- Read referenced files directly from their paths before acting.",
    "- Do not assume Ralph copied file or image contents into this prompt.",
    "- If no changes are needed, explain why in the summary.",
    "- `changed_files`, `artifacts`, `follow_up_tasks`, `user_checks`, `validation_hints`, and `blockers` must always be arrays.",
    "- Use `blocked` only when progress cannot continue without an external unblocker.",
    "- Use `partial` when you made progress but more work remains.",
    "",
    "Ralph Reference Files:",
    `- Plan: ${context.planPath}`,
    `- Job spec: ${context.specPath}`,
    `- Input manifest: ${context.inputManifestPath}`,
    "",
    "Referenced Input Paths:",
    ...(context.inputDocuments.length === 0
      ? ["- None."]
      : context.inputDocuments.map((document) => `- [${document.kind}] ${document.path}`)),
    "",
    "Open the referenced files as needed and execute the task."
  ];

  return `${lines.join("\n")}\n`;
}

export function buildResultJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "status",
      "task_id",
      "summary",
      "changed_files",
      "artifacts",
      "follow_up_tasks",
      "user_checks",
      "validation_hints",
      "blockers"
    ],
    properties: {
      status: {
        type: "string",
        enum: ["completed", "partial", "blocked", "failed"]
      },
      task_id: {
        type: "string"
      },
      summary: {
        type: "string"
      },
      changed_files: {
        type: "array",
        items: { type: "string" }
      },
      artifacts: {
        type: "array",
        items: { type: "string" }
      },
      follow_up_tasks: {
        type: "array",
        items: { type: "string" }
      },
      user_checks: {
        type: "array",
        items: { type: "string" }
      },
      validation_hints: {
        type: "array",
        items: { type: "string" }
      },
      blockers: {
        type: "array",
        items: { type: "string" }
      }
    }
  };
}

export function buildOutputFileArgs(context: AdapterRunContext): string[] {
  return ["-o", context.outputPath];
}
