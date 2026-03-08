import type { AgentResult, RalphRunRecord } from "../adapters/index.js";
import { atomicWriteFile, listDirectoryEntries, readJsonFile, readTextFile } from "../state/index.js";

export const reportingFeature = {
  name: "reporting"
} as const;

export async function updateUserChecksReport(
  userChecksPath: string,
  userChecks: AgentResult["user_checks"]
): Promise<void> {
  const existingContent = (await readTextFile(userChecksPath)) ?? "# User Checks\n\n";
  const existingChecks = existingContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
  const mergedChecks = Array.from(new Set([...existingChecks, ...userChecks]));
  const lines = ["# User Checks", ""];

  if (mergedChecks.length === 0) {
    lines.push("None.");
  } else {
    lines.push(...mergedChecks.map((entry) => `- ${entry}`));
  }

  lines.push("");
  await atomicWriteFile(userChecksPath, `${lines.join("\n")}`);
}

export async function updateFinalSummaryReport(options: {
  finalSummaryPath: string;
  title: string;
  jobStatus: string;
  runsDirectoryPath: string;
}): Promise<void> {
  const runIds = (await listDirectoryEntries(options.runsDirectoryPath)).sort();
  const runRecords = (
    await Promise.all(
      runIds.map(async (runId) =>
        readJsonFile<RalphRunRecord>(`${options.runsDirectoryPath}/${runId}/run-record.json`)
      )
    )
  ).filter((record): record is RalphRunRecord => record !== undefined);

  if (runRecords.length === 0) {
    await atomicWriteFile(
      options.finalSummaryPath,
      `# Final Summary\n\nTitle: ${options.title}\n\nStatus: ${options.jobStatus}\n\nPending.\n`
    );
    return;
  }

  const latestRun = runRecords.at(-1)!;
  const lines = [
    "# Final Summary",
    "",
    `Title: ${options.title}`,
    "",
    `Status: ${options.jobStatus}`,
    `Latest run: ${latestRun.runId}`,
    `Latest run status: ${latestRun.status}`,
    "",
    "Run history:",
    ""
  ];

  for (const runRecord of runRecords) {
    lines.push(`## ${runRecord.runId} ${runRecord.taskId}`, "");
    lines.push(`- Status: ${runRecord.status}`);
    lines.push(`- Summary: ${runRecord.summary}`);

    if (runRecord.changedFiles.length > 0) {
      lines.push("- Changed files:");
      lines.push(...runRecord.changedFiles.map((value) => `  - ${value}`));
    }

    if (runRecord.followUpTasks.length > 0) {
      lines.push("- Follow-up tasks:");
      lines.push(...runRecord.followUpTasks.map((value) => `  - ${value}`));
    }

    if (runRecord.blockers.length > 0) {
      lines.push("- Blockers:");
      lines.push(...runRecord.blockers.map((value) => `  - ${value}`));
    }

    lines.push("");
  }

  await atomicWriteFile(options.finalSummaryPath, `${lines.join("\n")}\n`);
}
