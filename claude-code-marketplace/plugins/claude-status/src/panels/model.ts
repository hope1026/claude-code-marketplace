/**
 * Model panel - shows current model name
 */

import type { RenderContext } from '../types.js';
import { paint, ANSI } from '../lib/style.js';
import { shortModel } from '../lib/format.js';

export function render(ctx: RenderContext): string {
  const name = ctx.input.model?.display_name || '-';
  return paint(`🤖 ${shortModel(name)}`, ANSI.softCyan);
}
