/**
 * Authentication utilities
 */

import { execFileSync } from 'child_process';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const TTL = 10_000;
let cached: { token: string | null; ts?: number; mtime?: number } | null = null;

/**
 * Get OAuth token from system
 */
export async function getToken(): Promise<string | null> {
  try {
    if (process.platform === 'darwin') {
      return await fromKeychain();
    }
    return await fromFile();
  } catch {
    return null;
  }
}

async function fromKeychain(): Promise<string | null> {
  if (cached?.ts && Date.now() - cached.ts < TTL) {
    return cached.token;
  }

  try {
    const raw = execFileSync(
      'security',
      ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const data = JSON.parse(raw);
    const token = data?.claudeAiOauth?.accessToken ?? null;
    cached = { token, ts: Date.now() };
    return token;
  } catch {
    return await fromFile();
  }
}

async function fromFile(): Promise<string | null> {
  try {
    const path = join(homedir(), '.claude', '.credentials.json');
    const s = await stat(path);
    if (cached?.mtime === s.mtimeMs) return cached.token;

    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw);
    const token = data?.claudeAiOauth?.accessToken ?? null;
    cached = { token, mtime: s.mtimeMs };
    return token;
  } catch {
    return null;
  }
}
