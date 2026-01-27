/**
 * Terminal styling utilities
 */

export const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  softCyan: '\x1b[38;5;117m',
  softYellow: '\x1b[38;5;222m',
  softGreen: '\x1b[38;5;151m',
  softRed: '\x1b[38;5;210m',
  softPink: '\x1b[38;5;218m',
} as const;

/**
 * Apply color to text
 */
export function paint(text: string, color: string): string {
  return `${color}${text}${ANSI.reset}`;
}

/**
 * Get color by percentage threshold
 */
export function thresholdColor(pct: number): string {
  if (pct <= 50) return ANSI.softGreen;
  if (pct <= 80) return ANSI.softYellow;
  return ANSI.softRed;
}

/**
 * Render a bar graph
 */
export function bar(pct: number, width = 10): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const str = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  return paint(str, thresholdColor(clamped));
}
