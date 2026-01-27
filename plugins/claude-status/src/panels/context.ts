/**
 * Context panel - shows usage bar and token counts
 */

import type { RenderContext } from '../types.js';
import { bar, paint, thresholdColor, ANSI } from '../lib/style.js';
import { fmtTokens, pct } from '../lib/format.js';

export function render(ctx: RenderContext): string {
  const cw = ctx.input.context_window;
  const usage = cw?.current_usage;
  const size = cw?.context_window_size || 200000;

  if (!usage) {
    return `${bar(0)} ${paint('0%', ANSI.softGreen)} 0/${fmtTokens(size)}`;
  }

  const input =
    usage.input_tokens +
    usage.cache_creation_input_tokens +
    usage.cache_read_input_tokens;

  const percent = pct(input, size);
  const sep = ` ${ANSI.dim}│${ANSI.reset} `;

  return [
    bar(percent),
    paint(`${percent}%`, thresholdColor(percent)),
    `${fmtTokens(input)}/${fmtTokens(size)}`,
  ].join(sep);
}
