import type { AgentResult, RalphRunRecord } from "../adapters/index.js";
import { atomicWriteFile, readTextFile } from "../state/index.js";

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
  runRecord: RalphRunRecord;
}): Promise<void> {
  const lines = [
    "# Final Summary",
    "",
    `Title: ${options.title}`,
    "",
    `Latest run: ${options.runRecord.runId}`,
    `Status: ${options.runRecord.status}`,
    "",
    options.runRecord.summary
  ];

  if (options.runRecord.changedFiles.length > 0) {
    lines.push("", "Changed files:", "", ...options.runRecord.changedFiles.map((value) => `- ${value}`));
  }

  if (options.runRecord.blockers.length > 0) {
    lines.push("", "Blockers:", "", ...options.runRecord.blockers.map((value) => `- ${value}`));
  }

  await atomicWriteFile(options.finalSummaryPath, `${lines.join("\n")}\n`);
}
