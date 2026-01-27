/**
 * Transcript log reader
 */

import { readFile, stat } from 'fs/promises';
import type { LogEntry, ParsedLog } from '../types.js';

let cache: { path: string; mtime: number; data: ParsedLog } | null = null;

/**
 * Parse transcript log file
 */
export async function readLog(path: string): Promise<ParsedLog | null> {
  try {
    const s = await stat(path);
    if (cache?.path === path && cache.mtime === s.mtimeMs) {
      return cache.data;
    }

    const raw = await readFile(path, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const entries: LogEntry[] = [];

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {}
    }

    const toolCalls = new Map<string, { name: string; time?: string }>();
    const toolDone = new Set<string>();
    let startTime: number | undefined;

    for (const e of entries) {
      if (!startTime && e.timestamp) {
        startTime = new Date(e.timestamp).getTime();
      }

      if (e.type === 'assistant' && e.message?.content) {
        for (const b of e.message.content) {
          if (b.type === 'tool_use' && b.id && b.name) {
            toolCalls.set(b.id, { name: b.name, time: e.timestamp });
          }
        }
      }

      if (e.type === 'user' && e.message?.content) {
        for (const b of e.message.content) {
          if (b.type === 'tool_result' && b.tool_use_id) {
            toolDone.add(b.tool_use_id);
          }
        }
      }
    }

    const data: ParsedLog = { entries, toolCalls, toolDone, startTime };
    cache = { path, mtime: s.mtimeMs, data };
    return data;
  } catch {
    return null;
  }
}

/**
 * Get active (running) tools
 */
export function getActiveTool(log: ParsedLog): { name: string; since: number }[] {
  const result: { name: string; since: number }[] = [];
  for (const [id, info] of log.toolCalls) {
    if (!log.toolDone.has(id)) {
      result.push({
        name: info.name,
        since: info.time ? new Date(info.time).getTime() : Date.now(),
      });
    }
  }
  return result;
}

/**
 * Get completed tool count
 */
export function getDoneCount(log: ParsedLog): number {
  return log.toolDone.size;
}

/**
 * Extract todo progress from TodoWrite calls
 */
export function getTodos(log: ParsedLog): { current?: string; done: number; total: number } | null {
  let last: unknown = null;

  for (const [id, info] of log.toolCalls) {
    if (info.name === 'TodoWrite' && log.toolDone.has(id)) {
      for (const e of log.entries) {
        if (e.type === 'assistant' && e.message?.content) {
          for (const b of e.message.content) {
            if (b.type === 'tool_use' && b.id === id && b.input) {
              last = b.input;
            }
          }
        }
      }
    }
  }

  if (!last || typeof last !== 'object') return null;
  const input = last as { todos?: Array<{ content: string; status: string }> };
  if (!Array.isArray(input.todos)) return null;

  const todos = input.todos;
  const done = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;
  const active = todos.find((t) => t.status === 'in_progress' || t.status === 'pending');

  return { current: active?.content, done, total };
}

/**
 * Extract agent (Task) status
 */
export function getAgents(log: ParsedLog): { running: string[]; done: number } {
  const running: string[] = [];
  let done = 0;

  for (const [id, info] of log.toolCalls) {
    if (info.name === 'Task') {
      if (log.toolDone.has(id)) {
        done++;
      } else {
        for (const e of log.entries) {
          if (e.type === 'assistant' && e.message?.content) {
            for (const b of e.message.content) {
              if (b.type === 'tool_use' && b.id === id && b.input) {
                const inp = b.input as { description?: string; subagent_type?: string };
                running.push(inp.description?.slice(0, 20) || inp.subagent_type || 'Agent');
              }
            }
          }
        }
      }
    }
  }

  return { running, done };
}
