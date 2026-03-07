/**
 * Input data from Claude Code stdin
 */
export interface ClaudeInput {
  model: {
    id: string;
    display_name: string;
  };
  workspace: {
    current_dir: string;
  };
  context_window: {
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;
    current_usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    } | null;
  };
  cost: {
    total_cost_usd: number;
  };
  transcript_path?: string;
  session_id?: string;
}

/**
 * API usage data
 */
export interface UsageData {
  fiveHour: { percent: number; resetTime: string | null } | null;
  sevenDay: { percent: number; resetTime: string | null } | null;
  sevenDaySonnet: { percent: number; resetTime: string | null } | null;
}

/**
 * Panel identifier
 */
export type PanelType =
  | 'model'
  | 'context'
  | 'cost'
  | 'limit5h'
  | 'limit7d'
  | 'limit7dSonnet'
  | 'tools'
  | 'agents'
  | 'todos'
  | 'cache';

/**
 * Render context for panels
 */
export interface RenderContext {
  input: ClaudeInput;
  usage: UsageData | null;
}

/**
 * Transcript entry structure
 */
export interface LogEntry {
  type: 'assistant' | 'user' | 'tool_result' | 'system';
  timestamp?: string;
  message?: {
    content?: Array<{
      type: 'tool_use' | 'tool_result' | 'text';
      id?: string;
      tool_use_id?: string;
      name?: string;
      input?: unknown;
    }>;
  };
}

/**
 * Parsed log data
 */
export interface ParsedLog {
  entries: LogEntry[];
  toolCalls: Map<string, { name: string; time?: string }>;
  toolDone: Set<string>;
  startTime?: number;
}
