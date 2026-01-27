/**
 * API client for usage data
 */

import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { UsageData } from '../types.js';
import { getToken } from './auth.js';

declare const __VERSION__: string;
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.0';
const TIMEOUT = 5000;
const CACHE_DIR = join(homedir(), '.cache', 'claude-status');

const memCache = new Map<string, { data: UsageData; ts: number }>();
const pending = new Map<string, Promise<UsageData | null>>();
let lastHash: string | null = null;

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

async function ensureDir() {
  try {
    await mkdir(CACHE_DIR, { recursive: true, mode: 0o700 });
  } catch {}
}

function cachePath(h: string): string {
  return join(CACHE_DIR, `usage-${h}.json`);
}

async function loadDisk(h: string, ttl: number): Promise<UsageData | null> {
  try {
    const raw = await readFile(cachePath(h), 'utf-8');
    const obj = JSON.parse(raw);
    if ((Date.now() - obj.ts) / 1000 < ttl) return obj.data;
  } catch {}
  return null;
}

async function saveDisk(h: string, data: UsageData) {
  try {
    await ensureDir();
    await writeFile(cachePath(h), JSON.stringify({ data, ts: Date.now() }), { mode: 0o600 });
  } catch {}
}

async function fetchApi(token: string, h: string): Promise<UsageData | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

    const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `claude-status/${VERSION}`,
        Authorization: `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = await res.json();

    const data: UsageData = {
      fiveHour: json.five_hour
        ? { percent: Math.round(json.five_hour.utilization), resetTime: json.five_hour.resets_at }
        : null,
      sevenDay: json.seven_day
        ? { percent: Math.round(json.seven_day.utilization), resetTime: json.seven_day.resets_at }
        : null,
      sevenDaySonnet: json.seven_day_sonnet
        ? { percent: Math.round(json.seven_day_sonnet.utilization), resetTime: json.seven_day_sonnet.resets_at }
        : null,
    };

    memCache.set(h, { data, ts: Date.now() });
    await saveDisk(h, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch usage limits with caching
 */
export async function fetchUsage(ttlSec = 60): Promise<UsageData | null> {
  const token = await getToken();
  if (!token) {
    if (lastHash) {
      const c = memCache.get(lastHash);
      if (c) return c.data;
      return await loadDisk(lastHash, ttlSec * 10);
    }
    return null;
  }

  const h = hash(token);
  lastHash = h;

  const c = memCache.get(h);
  if (c && (Date.now() - c.ts) / 1000 < ttlSec) return c.data;

  const disk = await loadDisk(h, ttlSec);
  if (disk) {
    memCache.set(h, { data: disk, ts: Date.now() });
    return disk;
  }

  if (pending.has(h)) return pending.get(h)!;

  const p = fetchApi(token, h);
  pending.set(h, p);
  try {
    return await p;
  } finally {
    pending.delete(h);
  }
}
