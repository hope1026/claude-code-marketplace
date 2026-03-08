import { cancelJob, createJob, getJobOverview, loadJobDetails } from "../job/index.js";
import { resumeJob } from "../execution/index.js";
import { version } from "../shared/constants/index.js";
import { mcpToolDefinitions } from "./tools/index.js";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export async function startMcpServer(): Promise<number> {
  let buffer = Buffer.alloc(0);
  let expectedBodyLength: number | null = null;

  process.stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    void processIncomingBuffer();
  });

  process.stdin.resume();

  return await new Promise<number>((resolve) => {
    process.stdin.on("end", () => resolve(0));
  });

  async function processIncomingBuffer(): Promise<void> {
    while (true) {
      if (expectedBodyLength === null) {
        const headerEndIndex = buffer.indexOf("\r\n\r\n");

        if (headerEndIndex === -1) {
          return;
        }

        const headerText = buffer.subarray(0, headerEndIndex).toString("utf8");
        const contentLengthHeader = headerText
          .split("\r\n")
          .find((line) => line.toLowerCase().startsWith("content-length:"));

        if (contentLengthHeader === undefined) {
          writeJsonRpcResponse({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32600,
              message: "Missing Content-Length header."
            }
          });
          buffer = Buffer.alloc(0);
          return;
        }

        expectedBodyLength = Number.parseInt(contentLengthHeader.split(":")[1].trim(), 10);
        buffer = buffer.subarray(headerEndIndex + 4);
      }

      if (expectedBodyLength === null || buffer.length < expectedBodyLength) {
        return;
      }

      const body = buffer.subarray(0, expectedBodyLength).toString("utf8");
      buffer = buffer.subarray(expectedBodyLength);
      expectedBodyLength = null;

      let request: JsonRpcRequest;

      try {
        request = JSON.parse(body) as JsonRpcRequest;
      } catch {
        writeJsonRpcResponse({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Invalid JSON payload."
          }
        });
        continue;
      }

      const response = await handleRequest(request);

      if (response !== null) {
        writeJsonRpcResponse(response);
      }
    }
  }
}

async function handleRequest(
  request: JsonRpcRequest
): Promise<JsonRpcResponse | null> {
  if (request.method === "notifications/initialized") {
    return null;
  }

  try {
    switch (request.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id: request.id ?? null,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "@weppy/ralph",
              version
            },
            capabilities: {
              tools: {}
            }
          }
        };
      case "ping":
        return {
          jsonrpc: "2.0",
          id: request.id ?? null,
          result: {}
        };
      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: request.id ?? null,
          result: {
            tools: mcpToolDefinitions
          }
        };
      case "tools/call":
        return {
          jsonrpc: "2.0",
          id: request.id ?? null,
          result: await callTool(request.params ?? {})
        };
      default:
        return {
          jsonrpc: "2.0",
          id: request.id ?? null,
          error: {
            code: -32601,
            message: `Unknown method: ${request.method}`
          }
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : "Unhandled MCP error."
      }
    };
  }
}

async function callTool(params: Record<string, unknown>): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: unknown;
}> {
  const toolName = asString(params.name);
  const args = isRecord(params.arguments) ? params.arguments : {};

  let payload: unknown;

  switch (toolName) {
    case "start_job": {
      const result = await createJob({
        title: requireString(args.title, "title"),
        agent: requireAgent(args.agent),
        workspacePath: asOptionalString(args.workspace_path),
        stateDirectoryPath: asOptionalString(args.state_dir),
        inputDocuments: asStringArray(args.input_documents),
        validateCommands: asStringArray(args.validation_commands),
        maxRetriesPerTask: asOptionalNumber(args.max_retries_per_task)
      });
      payload = {
        job_id: result.snapshot.job.id,
        status: result.snapshot.job.status,
        workspace_path: result.snapshot.job.workspacePath,
        state_directory_path: result.snapshot.job.stateDirectoryPath,
        next_action: result.snapshot.runtime.nextAction
      };
      break;
    }
    case "get_status": {
      const result = await getJobOverview({
        jobId: asOptionalString(args.job_id),
        workspacePath: asOptionalString(args.workspace_path),
        stateDirectoryPath: asOptionalString(args.state_dir)
      });
      payload = {
        job: result.snapshot.job,
        runtime: result.snapshot.runtime,
        tasks: result.snapshot.tasks,
        run_ids: result.runIds
      };
      break;
    }
    case "get_result": {
      const result = await loadJobDetails({
        jobId: asOptionalString(args.job_id),
        workspacePath: asOptionalString(args.workspace_path),
        stateDirectoryPath: asOptionalString(args.state_dir)
      });
      payload = result;
      break;
    }
    case "resume_job": {
      const result = await resumeJob({
        jobId: asOptionalString(args.job_id),
        workspacePath: asOptionalString(args.workspace_path),
        stateDirectoryPath: asOptionalString(args.state_dir),
        maxIterations: asOptionalNumber(args.max_iterations)
      });
      payload = result;
      break;
    }
    case "cancel_job": {
      const result = await cancelJob({
        jobId: asOptionalString(args.job_id),
        workspacePath: asOptionalString(args.workspace_path),
        stateDirectoryPath: asOptionalString(args.state_dir)
      });
      payload = result;
      break;
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  };
}

function writeJsonRpcResponse(response: JsonRpcResponse): void {
  const body = JSON.stringify(response);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Expected a string.");
  }

  return value;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required string field: ${fieldName}`);
  }

  return value;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function requireAgent(value: unknown): "codex" | "claude-code" | "custom-command" {
  if (value === "codex" || value === "claude-code" || value === "custom-command") {
    return value;
  }

  throw new Error("`agent` must be one of: codex, claude-code, custom-command.");
}
