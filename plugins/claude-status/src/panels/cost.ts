/**
 * Cost panel - shows session cost
 */

import type { RenderContext } from '../types.js';
import { paint, ANSI } from '../lib/style.js';
import { fmtCost } from '../lib/format.js';

export function render(ctx: RenderContext): string {
  const cost = ctx.input.cost?.total_cost_usd ?? 0;
  return paint(fmtCost(cost), ANSI.softYellow);
}
