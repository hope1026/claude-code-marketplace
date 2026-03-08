import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cliPath = resolve(repoRoot, "dist/cli.js");

test("start/status use workspace .ralph-cache by default", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-start-"));

  try {
    const start = await runCli([
      "start",
      "--title",
      "Integration Start",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--json"
    ]);

    assert.equal(start.status, "planned");
    assert.equal(start.state_directory_path, join(workspacePath, ".ralph-cache"));
    const inputsManifest = JSON.parse(
      await readFile(join(start.state_directory_path, "jobs", start.job_id, "inputs.json"), "utf8")
    );
    assert.deepEqual(inputsManifest, []);

    const status = await runCli([
      "status",
      "--workspace",
      workspacePath,
      "--json"
    ]);

    assert.equal(status.job_id, start.job_id);
    assert.equal(status.status, "planned");
    assert.equal(status.remaining_task_count, 1);
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("resume handles completed follow-up tasks and completes the job", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-resume-"));
  const inputPath = join(workspacePath, "spec.md");
  await writeFile(inputPath, "# Spec\n\nIntegration resume flow.\n", "utf8");
  await writeFile(join(workspacePath, "marker.txt"), "ok\n", "utf8");

  const customCommand =
    "if grep -q 'TASK-001' \"$RALPH_PROMPT_PATH\"; then " +
    "printf '{\"status\":\"completed\",\"task_id\":\"TASK-001\",\"summary\":\"first pass completed with follow-up\",\"changed_files\":[\"marker.txt\"],\"artifacts\":[],\"follow_up_tasks\":[\"Finalize task\"],\"user_checks\":[\"Inspect final marker\"],\"validation_hints\":[],\"blockers\":[]}\\n' > \"$RALPH_OUTPUT_PATH\"; " +
    "else " +
    "printf '{\"status\":\"completed\",\"task_id\":\"TASK-002\",\"summary\":\"follow-up completed\",\"changed_files\":[\"marker.txt\"],\"artifacts\":[],\"follow_up_tasks\":[],\"user_checks\":[],\"validation_hints\":[],\"blockers\":[]}\\n' > \"$RALPH_OUTPUT_PATH\"; " +
    "fi";

  try {
    const start = await runCli([
      "start",
      "--title",
      "Resume Integration",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--input",
      inputPath,
      "--validate-cmd",
      "test -f marker.txt",
      "--max-retries",
      "2",
      "--json"
    ]);

    const resume = await runCli(
      ["resume", "--workspace", workspacePath, "--json"],
      {
        env: {
          ...process.env,
          RALPH_CUSTOM_AGENT_COMMAND: customCommand
        }
      }
    );

    assert.equal(resume.job_status, "completed");
    assert.equal(resume.iterations, 2);

    const result = await runCli(["result", "--workspace", workspacePath, "--json"]);

    assert.equal(result.status, "completed");
    assert.match(result.final_summary, /follow-up completed/);
    assert.match(result.user_checks, /Inspect final marker/);
    assert.equal(result.latest_agent_result.status, "completed");

    const firstRunResultPath = join(
      start.state_directory_path,
      "jobs",
      start.job_id,
      "runs",
      "run-001",
      "result.json"
    );
    const firstRunResult = JSON.parse(await readFile(firstRunResultPath, "utf8"));
    assert.equal(firstRunResult.status, "completed");
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("resume prewrites running state, placeholder logs, and path-only input references", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-preflight-"));
  const inputPath = join(workspacePath, "brief.md");
  const imagePath = join(workspacePath, "reference.png");
  const uniqueMarker = "UNIQUE_INPUT_CONTENT_SHOULD_NOT_BE_INLINED";
  await writeFile(inputPath, `# Brief\n\n${uniqueMarker}\n`, "utf8");
  await writeFile(imagePath, "not-a-real-image\n", "utf8");

  const customCommand =
    "node -e 'setTimeout(() => { " +
    "require(\"fs\").writeFileSync(process.env.RALPH_OUTPUT_PATH, JSON.stringify({" +
    "status:\"completed\",task_id:\"TASK-001\",summary:\"done\",changed_files:[],artifacts:[],follow_up_tasks:[],user_checks:[],validation_hints:[],blockers:[]" +
    "}, null, 2)); }, 1500);'";

  try {
    const start = await runCli([
      "start",
      "--title",
      "Preflight Integration",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--input",
      inputPath,
      "--input",
      imagePath,
      "--json"
    ]);

    const resumeChild = spawn("node", [cliPath, "resume", "--workspace", workspacePath, "--json"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        RALPH_CUSTOM_AGENT_COMMAND: customCommand
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    resumeChild.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    resumeChild.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const runDirectoryPath = join(
      start.state_directory_path,
      "jobs",
      start.job_id,
      "runs",
      "run-001"
    );
    const promptPath = join(runDirectoryPath, "prompt.md");
    const runRecordPath = join(runDirectoryPath, "run-record.json");
    const stdoutLogPath = join(runDirectoryPath, "stdout.log");
    const stderrLogPath = join(runDirectoryPath, "stderr.log");

    await waitFor(async () => {
      const runningStatus = await runCli(["status", "--workspace", workspacePath, "--json"]);
      return runningStatus.status === "running" && runningStatus.last_run_id === "run-001";
    });

    const [prompt, runningRunRecord, stdoutLog, stderrLog] = await Promise.all([
      readFile(promptPath, "utf8"),
      readFile(runRecordPath, "utf8"),
      readFile(stdoutLogPath, "utf8"),
      readFile(stderrLogPath, "utf8")
    ]);

    assert.match(prompt, new RegExp(inputPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(prompt, new RegExp(imagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(prompt, new RegExp(uniqueMarker));
    assert.equal(JSON.parse(runningRunRecord).status, "running");
    assert.equal(JSON.parse(runningRunRecord).finishedAt, null);
    assert.equal(stdoutLog, "");
    assert.equal(stderrLog, "");

    await new Promise((resolve, reject) => {
      resumeChild.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`resume exited with ${code}: ${stderr}`));
      });
      resumeChild.on("error", reject);
    });

    assert.equal(JSON.parse(stdout).job_status, "completed");
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("validation failure retries once and then fails", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-validation-"));
  const customCommand =
    "printf '{\"status\":\"completed\",\"task_id\":\"TASK-001\",\"summary\":\"validation should fail\",\"changed_files\":[],\"artifacts\":[],\"follow_up_tasks\":[],\"user_checks\":[],\"validation_hints\":[],\"blockers\":[]}\\n' > \"$RALPH_OUTPUT_PATH\"";

  try {
    await runCli([
      "start",
      "--title",
      "Validation Integration",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--validate-cmd",
      "test -f missing.txt",
      "--max-retries",
      "1",
      "--json"
    ]);

    const resume = await runCli(
      ["resume", "--workspace", workspacePath, "--json"],
      {
        env: {
          ...process.env,
          RALPH_CUSTOM_AGENT_COMMAND: customCommand
        }
      }
    );

    assert.equal(resume.iterations, 2);
    assert.equal(resume.job_status, "failed");

    const status = await runCli(["status", "--workspace", workspacePath, "--json"]);
    assert.equal(status.status, "failed");
    assert.equal(status.retry_counts["TASK-001"], 1);
    assert.equal(status.last_validation_status, "failed");
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("blocked result without blockers is rejected as malformed and blocks after retry budget", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-blocked-"));
  const customCommand =
    "printf '{\"status\":\"blocked\",\"task_id\":\"TASK-001\",\"summary\":\"needs input\",\"changed_files\":[],\"artifacts\":[],\"follow_up_tasks\":[],\"user_checks\":[],\"validation_hints\":[],\"blockers\":[]}\\n' > \"$RALPH_OUTPUT_PATH\"";

  try {
    await runCli([
      "start",
      "--title",
      "Blocked Contract Integration",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--max-retries",
      "0",
      "--json"
    ]);

    const resume = await runCli(
      ["resume", "--workspace", workspacePath, "--json"],
      {
        env: {
          ...process.env,
          RALPH_CUSTOM_AGENT_COMMAND: customCommand
        }
      }
    );

    assert.equal(resume.job_status, "blocked");

    const result = await runCli(["result", "--workspace", workspacePath, "--json"]);
    assert.equal(result.latest_run_record.errorCode, "malformed_result");
    assert.equal(result.latest_agent_result.status, "failed");
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("missing result payload fails the task and records empty placeholder logs", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-missing-result-"));
  const customCommand = "true";

  try {
    const start = await runCli([
      "start",
      "--title",
      "Missing Result Integration",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--max-retries",
      "0",
      "--json"
    ]);

    const resume = await runCli(
      ["resume", "--workspace", workspacePath, "--json"],
      {
        env: {
          ...process.env,
          RALPH_CUSTOM_AGENT_COMMAND: customCommand
        }
      }
    );

    assert.equal(resume.job_status, "blocked");

    const runDirectoryPath = join(
      start.state_directory_path,
      "jobs",
      start.job_id,
      "runs",
      "run-001"
    );
    const result = JSON.parse(await readFile(join(runDirectoryPath, "result.json"), "utf8"));
    assert.match(result.summary, /did not return a result payload|invalid JSON|expected contract/i);
    assert.equal(await readFile(join(runDirectoryPath, "stdout.log"), "utf8"), "");
    assert.equal(await readFile(join(runDirectoryPath, "stderr.log"), "utf8"), "");
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("resume refuses terminal jobs", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-terminal-"));
  const customCommand =
    "printf '{\"status\":\"completed\",\"task_id\":\"TASK-001\",\"summary\":\"done\",\"changed_files\":[],\"artifacts\":[],\"follow_up_tasks\":[],\"user_checks\":[],\"validation_hints\":[],\"blockers\":[]}\\n' > \"$RALPH_OUTPUT_PATH\"";

  try {
    await runCli([
      "start",
      "--title",
      "Terminal Resume Integration",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--json"
    ]);

    await runCli(
      ["resume", "--workspace", workspacePath, "--json"],
      {
        env: {
          ...process.env,
          RALPH_CUSTOM_AGENT_COMMAND: customCommand
        }
      }
    );

    const failed = await runCliExpectFailure(["resume", "--workspace", workspacePath, "--json"]);
    assert.match(failed.stderr, /already completed/i);
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("state-dir override stores and loads job state outside workspace root", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-workspace-override-"));
  const stateDir = await mkdtemp(join(tmpdir(), "ralph-state-override-"));

  try {
    const start = await runCli([
      "start",
      "--title",
      "State Dir Override",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--state-dir",
      stateDir,
      "--json"
    ]);

    assert.equal(start.state_directory_path, stateDir);

    const status = await runCli([
      "status",
      "--state-dir",
      stateDir,
      "--json"
    ]);

    assert.equal(status.job_id, start.job_id);
    await assert.rejects(readFile(join(workspacePath, ".ralph-cache", "current-job.txt"), "utf8"));
    const overrideCurrent = await readFile(join(stateDir, "current-job.txt"), "utf8");
    assert.match(overrideCurrent, new RegExp(start.job_id));
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
    await rm(stateDir, { recursive: true, force: true });
  }
});

test("cancel marks a pending job as cancelled", async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), "ralph-cancel-"));

  try {
    await runCli([
      "start",
      "--title",
      "Cancel Integration",
      "--agent",
      "custom-command",
      "--workspace",
      workspacePath,
      "--json"
    ]);

    const cancelled = await runCli(["cancel", "--workspace", workspacePath, "--json"]);
    assert.equal(cancelled.status, "cancelled");

    const status = await runCli(["status", "--workspace", workspacePath, "--json"]);
    assert.equal(status.status, "cancelled");
    assert.equal(status.next_action, "none");
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});

test("mcp server responds to initialize and tools/list", async () => {
  const child = execFile("node", [cliPath, "mcp"], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  let stdout = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  const initialize = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {}
  };
  const listTools = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };

  child.stdin?.write(frame(initialize));
  child.stdin?.write(frame(listTools));
  child.stdin?.end();

  await new Promise((resolve, reject) => {
    child.on("close", resolve);
    child.on("error", reject);
  });

  assert.match(stdout, /"protocolVersion":"2024-11-05"/);
  assert.match(stdout, /"name":"start_job"/);
  assert.match(stdout, /"name":"cancel_job"/);
});

async function runCli(args, options = {}) {
  const { stdout } = await execFileAsync("node", [cliPath, ...args], {
    cwd: repoRoot,
    env: options.env ?? process.env,
    maxBuffer: 1024 * 1024
  });

  return JSON.parse(stdout);
}

async function runCliExpectFailure(args, options = {}) {
  try {
    await execFileAsync("node", [cliPath, ...args], {
      cwd: repoRoot,
      env: options.env ?? process.env,
      maxBuffer: 1024 * 1024
    });
  } catch (error) {
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      code: error.code ?? 1
    };
  }

  throw new Error("Expected command to fail.");
}

function frame(message) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

async function waitFor(predicate, timeoutMs = 5000, intervalMs = 100) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for condition.");
}
