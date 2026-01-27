/**
 * Cache panel - shows cache hit rate
 */

import type { RenderContext } from '../types.js';
import { paint, thresholdColor } from '../lib/style.js';

export function render(ctx: RenderContext): string {
  const usage = ctx.input.context_window?.current_usage;

  if (!usage) {
    return `📦 ${paint('0%', thresholdColor(100))}`;
  }

  const cacheRead = usage.cache_read_input_tokens;
  const fresh = usage.input_tokens;
  const creation = usage.cache_creation_input_tokens;
  const total = cacheRead + fresh + creation;

  if (total === 0) {
    return `📦 ${paint('0%', thresholdColor(100))}`;
  }

  const hitPct = Math.min(100, Math.max(0, Math.round((cacheRead / total) * 100)));
  // Higher cache = better, so invert for color
  const color = thresholdColor(100 - hitPct);

  return `📦 ${paint(`${hitPct}%`, color)}`;
}
