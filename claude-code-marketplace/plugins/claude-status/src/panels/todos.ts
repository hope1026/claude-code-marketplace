/**
 * Todos panel - shows current task and progress
 */

import type { ParsedLog } from '../types.js';
import { paint, ANSI, thresholdColor } from '../lib/style.js';
import { getTodos } from '../lib/log-reader.js';

export function render(log: ParsedLog | null): string | null {
  if (!log) return null;

  const data = getTodos(log);
  if (!data || data.total === 0) {
    return paint('Todos: -', ANSI.dim);
  }

  const { current, done, total } = data;
  const pct = Math.round((done / total) * 100);

  if (current) {
    const task = current.length > 15 ? current.slice(0, 15) + '...' : current;
    return `${paint('✓', ANSI.softGreen)} ${task} [${done}/${total}]`;
  }

  const color = done === total ? ANSI.softGreen : thresholdColor(100 - pct);
  return paint(`Todos: ${done}/${total}`, color);
}
