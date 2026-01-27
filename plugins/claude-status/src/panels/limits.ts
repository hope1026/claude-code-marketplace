/**
 * Rate limit panels - shows 5h and 7d usage limits
 */

import type { RenderContext } from '../types.js';
import { paint, thresholdColor, ANSI } from '../lib/style.js';
import { fmtRemaining } from '../lib/format.js';

function renderLimit(
  label: string,
  data: { percent: number; resetTime: string | null } | null
): string {
  if (!data) return paint('⚠️', ANSI.yellow);

  const color = thresholdColor(data.percent);
  const pctStr = paint(`${data.percent}%`, color);
  const remaining = data.resetTime ? ` (${fmtRemaining(data.resetTime)})` : '';

  return `${label}: ${pctStr}${remaining}`;
}

export function render5h(ctx: RenderContext): string {
  return renderLimit('5h', ctx.usage?.fiveHour ?? null);
}

export function render7d(ctx: RenderContext): string | null {
  if (!ctx.usage?.sevenDay) return null;
  return renderLimit('7d', ctx.usage.sevenDay);
}

export function render7dSonnet(ctx: RenderContext): string | null {
  if (!ctx.usage?.sevenDaySonnet) return null;
  return renderLimit('7d-S', ctx.usage.sevenDaySonnet);
}
