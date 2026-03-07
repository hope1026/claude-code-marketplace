/**
 * Agents panel - shows running/completed agents
 */

import type { ParsedLog } from '../types.js';
import { paint, ANSI } from '../lib/style.js';
import { getAgents } from '../lib/log-reader.js';

export function render(log: ParsedLog | null): string | null {
  if (!log) return null;

  const { running, done } = getAgents(log);

  if (running.length === 0 && done === 0) return null;

  if (running.length === 0) {
    return paint(`Agent: ${done} done`, ANSI.dim);
  }

  const name = running[0].length > 20 ? running[0].slice(0, 20) + '...' : running[0];
  const more = running.length > 1 ? ` +${running.length - 1}` : '';

  return `${paint('🤖', ANSI.cyan)} Agent: ${name}${more}`;
}
