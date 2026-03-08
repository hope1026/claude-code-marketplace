export const mcpToolCatalog = [
  "start_job",
  "get_status",
  "get_result",
  "resume_job",
  "cancel_job"
] as const;

export interface McpToolDefinition {
  name: (typeof mcpToolCatalog)[number];
  description: string;
  inputSchema: Record<string, unknown>;
}

export const mcpToolDefinitions: McpToolDefinition[] = [
  {
    name: "start_job",
    description: "Create a Ralph job in the target workspace.",
    inputSchema: {
      type: "object",
      required: ["title", "agent", "workspace_path"],
      properties: {
        title: { type: "string" },
        agent: { type: "string", enum: ["codex", "claude-code", "custom-command"] },
        workspace_path: { type: "string" },
        state_dir: { type: "string" },
        input_documents: {
          type: "array",
          items: { type: "string" }
        },
        validation_commands: {
          type: "array",
          items: { type: "string" }
        },
        max_retries_per_task: { type: "integer", minimum: 0 }
      }
    }
  },
  {
    name: "get_status",
    description: "Read the current Ralph job status.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        workspace_path: { type: "string" },
        state_dir: { type: "string" }
      }
    }
  },
  {
    name: "get_result",
    description: "Read the latest Ralph job result and reports.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        workspace_path: { type: "string" },
        state_dir: { type: "string" }
      }
    }
  },
  {
    name: "resume_job",
    description: "Resume a Ralph job until it reaches a non-resumable state or the iteration limit.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        workspace_path: { type: "string" },
        state_dir: { type: "string" },
        max_iterations: { type: "integer", minimum: 1 }
      }
    }
  },
  {
    name: "cancel_job",
    description: "Cancel a Ralph job and mark pending work as cancelled.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        workspace_path: { type: "string" },
        state_dir: { type: "string" }
      }
    }
  }
];
