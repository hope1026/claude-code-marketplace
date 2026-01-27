#!/usr/bin/env node
/**
 * Claude Status - Real-time status bar
 */

import type { ClaudeInput, RenderContext, ParsedLog } from './types.js';
import { fetchUsage } from './lib/api.js';
import { readLog } from './lib/log-reader.js';
import { ANSI } from './lib/style.js';

import * as modelPanel from './panels/model.js';
import * as contextPanel from './panels/context.js';
import * as costPanel from './panels/cost.js';
import * as limitsPanel from './panels/limits.js';
import * as toolsPanel from './panels/tools.js';
import * as agentsPanel from './panels/agents.js';
import * as todosPanel from './panels/todos.js';
import * as cachePanel from './panels/cache.js';

/**
 * Read stdin as JSON
 */
async function readInput(): Promise<ClaudeInput | null> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Build status line
 */
async function buildOutput(ctx: RenderContext, log: ParsedLog | null): Promise<string> {
  const sep = ` ${ANSI.dim}│${ANSI.reset} `;
  const parts: string[] = [];

  // Line 1: Model, Context, Cost, Limits
  const line1: string[] = [];
  line1.push(modelPanel.render(ctx));
  line1.push(contextPanel.render(ctx));
  line1.push(costPanel.render(ctx));
  line1.push(limitsPanel.render5h(ctx));

  const l7d = limitsPanel.render7d(ctx);
  if (l7d) line1.push(l7d);

  const l7ds = limitsPanel.render7dSonnet(ctx);
  if (l7ds) line1.push(l7ds);

  parts.push(line1.join(sep));

  // Line 2: Tools, Agents, Todos, Cache
  const line2: string[] = [];

  const tools = toolsPanel.render(log);
  if (tools) line2.push(tools);

  const agents = agentsPanel.render(log);
  if (agents) line2.push(agents);

  const todos = todosPanel.render(log);
  if (todos) line2.push(todos);

  line2.push(cachePanel.render(ctx));

  if (line2.length > 0) {
    parts.push(line2.join(sep));
  }

  return parts.join('\n');
}

/**
 * Main entry
 */
async function main() {
  const input = await readInput();
  if (!input) {
    console.log(`${ANSI.yellow}⚠️${ANSI.reset}`);
    return;
  }

  const usage = await fetchUsage(60);
  const ctx: RenderContext = { input, usage };

  let log: ParsedLog | null = null;
  if (input.transcript_path) {
    log = await readLog(input.transcript_path);
  }

  const output = await buildOutput(ctx, log);
  console.log(output);
}

main().catch(() => {
  console.log(`${ANSI.yellow}⚠️${ANSI.reset}`);
});
