export const adapterFeature = {
  supported: ["codex", "claude-code", "custom-command"]
} as const;

export type SupportedAgent = (typeof adapterFeature.supported)[number];

export function isSupportedAgent(value: string): value is SupportedAgent {
  return (adapterFeature.supported as readonly string[]).includes(value);
}

export {
  createAdapterFailure,
  getAdapterDefinition,
  parseAgentResult,
  persistRunLogs,
  runAdapter
} from "./run.js";
export type {
  AdapterDefinition,
  AdapterErrorCode,
  AdapterExecutionFailure,
  AdapterExecutionResult,
  AdapterPromptContext,
  AdapterRunContext,
  AgentResult,
  RalphRunRecord,
  ResultStatus
} from "./types.js";
