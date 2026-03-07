/**
 * Formatting utilities
 */

/**
 * Format token count (1500 -> "1.5K", 150000 -> "150K")
 */
export function fmtTokens(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return v >= 10 ? `${Math.round(v)}M` : `${v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return v >= 10 ? `${Math.round(v)}K` : `${v.toFixed(1)}K`;
  }
  return String(n);
}

/**
 * Format USD cost
 */
export function fmtCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

/**
 * Calculate percentage
 */
export function pct(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

/**
 * Format time remaining (ISO string -> "2h30m")
 */
export function fmtRemaining(iso: string | null): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return '0m';

  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (days > 0) return `${days}d${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h${mins % 60}m`;
  return `${mins}m`;
}

/**
 * Shorten model name (Claude 3.5 Sonnet -> Sonnet)
 */
export function shortModel(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('opus')) return 'Opus';
  if (lower.includes('sonnet')) return 'Sonnet';
  if (lower.includes('haiku')) return 'Haiku';
  return name.split(/\s+/).pop() || name;
}
