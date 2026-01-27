/**
 * Tools panel - shows running/completed tools
 */

import type { ParsedLog } from '../types.js';
import { paint, ANSI } from '../lib/style.js';
import { getActiveTool, getDoneCount } from '../lib/log-reader.js';

export function render(log: ParsedLog | null): string | null {
  if (!log) return null;

  const active = getActiveTool(log);
  const done = getDoneCount(log);

  if (active.length === 0) {
    return paint(`Tools: ${done} done`, ANSI.dim);
  }

  const names = active.slice(0, 2).map((t) => t.name).join(', ');
  const more = active.length > 2 ? ` +${active.length - 2}` : '';

  return `${paint('⚙️', ANSI.yellow)} ${names}${more} (${done} done)`;
}
