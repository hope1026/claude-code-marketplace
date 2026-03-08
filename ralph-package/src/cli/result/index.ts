import { loadJobDetails } from "../../job/index.js";
import { getSingleFlag, hasFlag, parseCliArgs } from "../../shared/utils/cli.js";
import { printError, printJson, printLine } from "../../shared/utils/output.js";

export async function runResultCommand(argv: string[]): Promise<number> {
  const parsedArgs = parseCliArgs(argv);
  const jobId = getSingleFlag(parsedArgs, "--job");
  const workspacePath = getSingleFlag(parsedArgs, "--workspace");
  const stateDirectoryPath = getSingleFlag(parsedArgs, "--state-dir");
  const jsonMode = hasFlag(parsedArgs, "--json");

  if (workspacePath === undefined && stateDirectoryPath === undefined) {
    printError("Either --workspace or --state-dir is required.");
    return 1;
  }

  try {
    const details = await loadJobDetails({
      jobId,
      workspacePath,
      stateDirectoryPath
    });

    if (jsonMode) {
      printJson({
        job_id: details.snapshot.job.id,
        status: details.snapshot.job.status,
        final_summary: details.finalSummary,
        user_checks: details.userChecks,
        latest_run_record: details.latestRunRecord,
        latest_agent_result: details.latestAgentResult,
        latest_validation: details.latestValidation
      });
      return 0;
    }

    printLine(`Job: ${details.snapshot.job.id}`);
    printLine(`Status: ${details.snapshot.job.status}`);
    printLine("");
    printLine("Final Summary:");
    printLine(details.finalSummary ?? "No final summary available.");
    printLine("User Checks:");
    printLine(details.userChecks ?? "No user checks available.");

    if (details.latestRunRecord !== null) {
      printLine("Latest Run:");
      printLine(`Run: ${details.latestRunRecord.runId}`);
      printLine(`Status: ${details.latestRunRecord.status}`);
      printLine(`Summary: ${details.latestRunRecord.summary}`);
    }

    return 0;
  } catch (error) {
    printError(error instanceof Error ? error.message : "Failed to load job result.");
    return 1;
  }
}
