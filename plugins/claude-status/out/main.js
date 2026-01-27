#!/usr/bin/env node

// src/lib/api.ts
import { createHash } from "crypto";
import { readFile as readFile2, writeFile, mkdir } from "fs/promises";
import { join as join2 } from "path";
import { homedir as homedir2 } from "os";

// src/lib/auth.ts
import { execFileSync } from "child_process";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
var TTL = 1e4;
var cached = null;
async function getToken() {
  try {
    if (process.platform === "darwin") {
      return await fromKeychain();
    }
    return await fromFile();
  } catch {
    return null;
  }
}
async function fromKeychain() {
  if (cached?.ts && Date.now() - cached.ts < TTL) {
    return cached.token;
  }
  try {
    const raw = execFileSync(
      "security",
      ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    const data = JSON.parse(raw);
    const token = data?.claudeAiOauth?.accessToken ?? null;
    cached = { token, ts: Date.now() };
    return token;
  } catch {
    return await fromFile();
  }
}
async function fromFile() {
  try {
    const path = join(homedir(), ".claude", ".credentials.json");
    const s = await stat(path);
    if (cached?.mtime === s.mtimeMs)
      return cached.token;
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw);
    const token = data?.claudeAiOauth?.accessToken ?? null;
    cached = { token, mtime: s.mtimeMs };
    return token;
  } catch {
    return null;
  }
}

// src/lib/api.ts
var VERSION = true ? "1.0.0" : "1.0.0";
var TIMEOUT = 5e3;
var CACHE_DIR = join2(homedir2(), ".cache", "claude-status");
var memCache = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
var lastHash = null;
function hash(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}
async function ensureDir() {
  try {
    await mkdir(CACHE_DIR, { recursive: true, mode: 448 });
  } catch {
  }
}
function cachePath(h) {
  return join2(CACHE_DIR, `usage-${h}.json`);
}
async function loadDisk(h, ttl) {
  try {
    const raw = await readFile2(cachePath(h), "utf-8");
    const obj = JSON.parse(raw);
    if ((Date.now() - obj.ts) / 1e3 < ttl)
      return obj.data;
  } catch {
  }
  return null;
}
async function saveDisk(h, data) {
  try {
    await ensureDir();
    await writeFile(cachePath(h), JSON.stringify({ data, ts: Date.now() }), { mode: 384 });
  } catch {
  }
}
async function fetchApi(token, h) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": `claude-status/${VERSION}`,
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20"
      },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok)
      return null;
    const json = await res.json();
    const data = {
      fiveHour: json.five_hour ? { percent: Math.round(json.five_hour.utilization), resetTime: json.five_hour.resets_at } : null,
      sevenDay: json.seven_day ? { percent: Math.round(json.seven_day.utilization), resetTime: json.seven_day.resets_at } : null,
      sevenDaySonnet: json.seven_day_sonnet ? { percent: Math.round(json.seven_day_sonnet.utilization), resetTime: json.seven_day_sonnet.resets_at } : null
    };
    memCache.set(h, { data, ts: Date.now() });
    await saveDisk(h, data);
    return data;
  } catch {
    return null;
  }
}
async function fetchUsage(ttlSec = 60) {
  const token = await getToken();
  if (!token) {
    if (lastHash) {
      const c2 = memCache.get(lastHash);
      if (c2)
        return c2.data;
      return await loadDisk(lastHash, ttlSec * 10);
    }
    return null;
  }
  const h = hash(token);
  lastHash = h;
  const c = memCache.get(h);
  if (c && (Date.now() - c.ts) / 1e3 < ttlSec)
    return c.data;
  const disk = await loadDisk(h, ttlSec);
  if (disk) {
    memCache.set(h, { data: disk, ts: Date.now() });
    return disk;
  }
  if (pending.has(h))
    return pending.get(h);
  const p = fetchApi(token, h);
  pending.set(h, p);
  try {
    return await p;
  } finally {
    pending.delete(h);
  }
}

// src/lib/log-reader.ts
import { readFile as readFile3, stat as stat3 } from "fs/promises";
var cache = null;
async function readLog(path) {
  try {
    const s = await stat3(path);
    if (cache?.path === path && cache.mtime === s.mtimeMs) {
      return cache.data;
    }
    const raw = await readFile3(path, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const entries = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
      }
    }
    const toolCalls = /* @__PURE__ */ new Map();
    const toolDone = /* @__PURE__ */ new Set();
    let startTime;
    for (const e of entries) {
      if (!startTime && e.timestamp) {
        startTime = new Date(e.timestamp).getTime();
      }
      if (e.type === "assistant" && e.message?.content) {
        for (const b of e.message.content) {
          if (b.type === "tool_use" && b.id && b.name) {
            toolCalls.set(b.id, { name: b.name, time: e.timestamp });
          }
        }
      }
      if (e.type === "user" && e.message?.content) {
        for (const b of e.message.content) {
          if (b.type === "tool_result" && b.tool_use_id) {
            toolDone.add(b.tool_use_id);
          }
        }
      }
    }
    const data = { entries, toolCalls, toolDone, startTime };
    cache = { path, mtime: s.mtimeMs, data };
    return data;
  } catch {
    return null;
  }
}
function getActiveTool(log) {
  const result = [];
  for (const [id, info] of log.toolCalls) {
    if (!log.toolDone.has(id)) {
      result.push({
        name: info.name,
        since: info.time ? new Date(info.time).getTime() : Date.now()
      });
    }
  }
  return result;
}
function getDoneCount(log) {
  return log.toolDone.size;
}
function getTodos(log) {
  let last = null;
  for (const [id, info] of log.toolCalls) {
    if (info.name === "TodoWrite" && log.toolDone.has(id)) {
      for (const e of log.entries) {
        if (e.type === "assistant" && e.message?.content) {
          for (const b of e.message.content) {
            if (b.type === "tool_use" && b.id === id && b.input) {
              last = b.input;
            }
          }
        }
      }
    }
  }
  if (!last || typeof last !== "object")
    return null;
  const input = last;
  if (!Array.isArray(input.todos))
    return null;
  const todos = input.todos;
  const done = todos.filter((t) => t.status === "completed").length;
  const total = todos.length;
  const active = todos.find((t) => t.status === "in_progress" || t.status === "pending");
  return { current: active?.content, done, total };
}
function getAgents(log) {
  const running = [];
  let done = 0;
  for (const [id, info] of log.toolCalls) {
    if (info.name === "Task") {
      if (log.toolDone.has(id)) {
        done++;
      } else {
        for (const e of log.entries) {
          if (e.type === "assistant" && e.message?.content) {
            for (const b of e.message.content) {
              if (b.type === "tool_use" && b.id === id && b.input) {
                const inp = b.input;
                running.push(inp.description?.slice(0, 20) || inp.subagent_type || "Agent");
              }
            }
          }
        }
      }
    }
  }
  return { running, done };
}

// src/lib/style.ts
var ANSI = {
  reset: "\x1B[0m",
  dim: "\x1B[2m",
  bold: "\x1B[1m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  cyan: "\x1B[36m",
  gray: "\x1B[90m",
  softCyan: "\x1B[38;5;117m",
  softYellow: "\x1B[38;5;222m",
  softGreen: "\x1B[38;5;151m",
  softRed: "\x1B[38;5;210m",
  softPink: "\x1B[38;5;218m"
};
function paint(text, color) {
  return `${color}${text}${ANSI.reset}`;
}
function thresholdColor(pct2) {
  if (pct2 <= 50)
    return ANSI.softGreen;
  if (pct2 <= 80)
    return ANSI.softYellow;
  return ANSI.softRed;
}
function bar(pct2, width = 10) {
  const clamped = Math.max(0, Math.min(100, pct2));
  const filled = Math.round(clamped / 100 * width);
  const empty = width - filled;
  const str = "\u2588".repeat(filled) + "\u2591".repeat(empty);
  return paint(str, thresholdColor(clamped));
}

// src/lib/format.ts
function fmtTokens(n) {
  if (n >= 1e6) {
    const v = n / 1e6;
    return v >= 10 ? `${Math.round(v)}M` : `${v.toFixed(1)}M`;
  }
  if (n >= 1e3) {
    const v = n / 1e3;
    return v >= 10 ? `${Math.round(v)}K` : `${v.toFixed(1)}K`;
  }
  return String(n);
}
function fmtCost(usd) {
  return `$${usd.toFixed(2)}`;
}
function pct(current, total) {
  if (total <= 0)
    return 0;
  return Math.min(100, Math.round(current / total * 100));
}
function fmtRemaining(iso) {
  if (!iso)
    return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0)
    return "0m";
  const mins = Math.floor(diff / 6e4);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0)
    return `${days}d${hrs % 24}h`;
  if (hrs > 0)
    return `${hrs}h${mins % 60}m`;
  return `${mins}m`;
}
function shortModel(name) {
  const lower = name.toLowerCase();
  if (lower.includes("opus"))
    return "Opus";
  if (lower.includes("sonnet"))
    return "Sonnet";
  if (lower.includes("haiku"))
    return "Haiku";
  return name.split(/\s+/).pop() || name;
}

// src/panels/model.ts
function render(ctx) {
  const name = ctx.input.model?.display_name || "-";
  return paint(`\u{1F916} ${shortModel(name)}`, ANSI.softCyan);
}

// src/panels/context.ts
function render2(ctx) {
  const cw = ctx.input.context_window;
  const usage = cw?.current_usage;
  const size = cw?.context_window_size || 2e5;
  if (!usage) {
    return `${bar(0)} ${paint("0%", ANSI.softGreen)} 0/${fmtTokens(size)}`;
  }
  const input = usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
  const percent = pct(input, size);
  const sep = ` ${ANSI.dim}\u2502${ANSI.reset} `;
  return [
    bar(percent),
    paint(`${percent}%`, thresholdColor(percent)),
    `${fmtTokens(input)}/${fmtTokens(size)}`
  ].join(sep);
}

// src/panels/cost.ts
function render3(ctx) {
  const cost = ctx.input.cost?.total_cost_usd ?? 0;
  return paint(fmtCost(cost), ANSI.softYellow);
}

// src/panels/limits.ts
function renderLimit(label, data) {
  if (!data)
    return paint("\u26A0\uFE0F", ANSI.yellow);
  const color = thresholdColor(data.percent);
  const pctStr = paint(`${data.percent}%`, color);
  const remaining = data.resetTime ? ` (${fmtRemaining(data.resetTime)})` : "";
  return `${label}: ${pctStr}${remaining}`;
}
function render5h(ctx) {
  return renderLimit("5h", ctx.usage?.fiveHour ?? null);
}
function render7d(ctx) {
  if (!ctx.usage?.sevenDay)
    return null;
  return renderLimit("7d", ctx.usage.sevenDay);
}
function render7dSonnet(ctx) {
  if (!ctx.usage?.sevenDaySonnet)
    return null;
  return renderLimit("7d-S", ctx.usage.sevenDaySonnet);
}

// src/panels/tools.ts
function render4(log) {
  if (!log)
    return null;
  const active = getActiveTool(log);
  const done = getDoneCount(log);
  if (active.length === 0) {
    return paint(`Tools: ${done} done`, ANSI.dim);
  }
  const names = active.slice(0, 2).map((t) => t.name).join(", ");
  const more = active.length > 2 ? ` +${active.length - 2}` : "";
  return `${paint("\u2699\uFE0F", ANSI.yellow)} ${names}${more} (${done} done)`;
}

// src/panels/agents.ts
function render5(log) {
  if (!log)
    return null;
  const { running, done } = getAgents(log);
  if (running.length === 0 && done === 0)
    return null;
  if (running.length === 0) {
    return paint(`Agent: ${done} done`, ANSI.dim);
  }
  const name = running[0].length > 20 ? running[0].slice(0, 20) + "..." : running[0];
  const more = running.length > 1 ? ` +${running.length - 1}` : "";
  return `${paint("\u{1F916}", ANSI.cyan)} Agent: ${name}${more}`;
}

// src/panels/todos.ts
function render6(log) {
  if (!log)
    return null;
  const data = getTodos(log);
  if (!data || data.total === 0) {
    return paint("Todos: -", ANSI.dim);
  }
  const { current, done, total } = data;
  const pct2 = Math.round(done / total * 100);
  if (current) {
    const task = current.length > 15 ? current.slice(0, 15) + "..." : current;
    return `${paint("\u2713", ANSI.softGreen)} ${task} [${done}/${total}]`;
  }
  const color = done === total ? ANSI.softGreen : thresholdColor(100 - pct2);
  return paint(`Todos: ${done}/${total}`, color);
}

// src/panels/cache.ts
function render7(ctx) {
  const usage = ctx.input.context_window?.current_usage;
  if (!usage) {
    return `\u{1F4E6} ${paint("0%", thresholdColor(100))}`;
  }
  const cacheRead = usage.cache_read_input_tokens;
  const fresh = usage.input_tokens;
  const creation = usage.cache_creation_input_tokens;
  const total = cacheRead + fresh + creation;
  if (total === 0) {
    return `\u{1F4E6} ${paint("0%", thresholdColor(100))}`;
  }
  const hitPct = Math.min(100, Math.max(0, Math.round(cacheRead / total * 100)));
  const color = thresholdColor(100 - hitPct);
  return `\u{1F4E6} ${paint(`${hitPct}%`, color)}`;
}

// src/main.ts
async function readInput() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    return null;
  }
}
async function buildOutput(ctx, log) {
  const sep = ` ${ANSI.dim}\u2502${ANSI.reset} `;
  const parts = [];
  const line1 = [];
  line1.push(render(ctx));
  line1.push(render2(ctx));
  line1.push(render3(ctx));
  line1.push(render5h(ctx));
  const l7d = render7d(ctx);
  if (l7d)
    line1.push(l7d);
  const l7ds = render7dSonnet(ctx);
  if (l7ds)
    line1.push(l7ds);
  parts.push(line1.join(sep));
  const line2 = [];
  const tools = render4(log);
  if (tools)
    line2.push(tools);
  const agents = render5(log);
  if (agents)
    line2.push(agents);
  const todos = render6(log);
  if (todos)
    line2.push(todos);
  line2.push(render7(ctx));
  if (line2.length > 0) {
    parts.push(line2.join(sep));
  }
  return parts.join("\n");
}
async function main() {
  const input = await readInput();
  if (!input) {
    console.log(`${ANSI.yellow}\u26A0\uFE0F${ANSI.reset}`);
    return;
  }
  const usage = await fetchUsage(60);
  const ctx = { input, usage };
  let log = null;
  if (input.transcript_path) {
    log = await readLog(input.transcript_path);
  }
  const output = await buildOutput(ctx, log);
  console.log(output);
}
main().catch(() => {
  console.log(`${ANSI.yellow}\u26A0\uFE0F${ANSI.reset}`);
});
