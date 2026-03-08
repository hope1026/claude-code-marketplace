import { getJobOverview } from "../../job/index.js";
import { getSingleFlag, hasFlag, parseCliArgs } from "../../shared/utils/cli.js";
import { printError, printJson, printLine } from "../../shared/utils/output.js";

export async function runStatusCommand(argv: string[]): Promise<number> {
  const parsedArgs = parseCliArgs(argv);
  const jobId = getSingleFlag(parsedArgs, "--job");
  const workspacePath = getSingleFlag(parsedArgs, "--workspace");
  const stateDirectoryPath = getSingleFlag(parsedArgs, "--state-dir");
  const jsonMode = hasFlag(parsedArgs, "--json");

  try {
    const { snapshot, runIds } = await getJobOverview({
      jobId,
      workspacePath,
      stateDirectoryPath
    });

    if (jsonMode) {
      printJson({
        job_id: snapshot.job.id,
        title: snapshot.job.title,
        status: snapshot.job.status,
        agent: snapshot.job.requestedAgent,
        workspace_path: snapshot.job.workspacePath,
        state_directory_path: snapshot.job.stateDirectoryPath,
        current_phase_id: snapshot.runtime.currentPhaseId,
        current_task_id: snapshot.runtime.currentTaskId,
        remaining_task_count: snapshot.runtime.remainingTaskCount,
        next_action: snapshot.runtime.nextAction,
        last_validation_status: snapshot.runtime.lastValidationStatus,
        max_retries_per_task: snapshot.job.retryPolicy.maxRetriesPerTask,
        retry_counts: snapshot.tasks.retryCounts,
        last_run_id: snapshot.runtime.lastRunId,
        run_ids: runIds
      });
      return 0;
    }

    printLine(`Job: ${snapshot.job.id}`);
    printLine(`Title: ${snapshot.job.title}`);
    printLine(`Status: ${snapshot.job.status}`);
    printLine(`Agent: ${snapshot.job.requestedAgent}`);
    printLine(`Workspace: ${snapshot.job.workspacePath}`);
    printLine(`State dir: ${snapshot.job.stateDirectoryPath}`);
    printLine(`Current phase: ${snapshot.runtime.currentPhaseId ?? "-"}`);
    printLine(`Current task: ${snapshot.runtime.currentTaskId ?? "-"}`);
    printLine(`Remaining tasks: ${String(snapshot.runtime.remainingTaskCount)}`);
    printLine(`Next action: ${snapshot.runtime.nextAction}`);
    printLine(`Validation: ${snapshot.runtime.lastValidationStatus}`);
    printLine(`Last run: ${snapshot.runtime.lastRunId ?? "-"}`);
    printLine(`Max retries per task: ${String(snapshot.job.retryPolicy.maxRetriesPerTask)}`);
    return 0;
  } catch (error) {
    printError(error instanceof Error ? error.message : "Failed to load job status.");
    return 1;
  }
}
