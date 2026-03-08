import { cancelJob } from "../../job/index.js";
import { getSingleFlag, hasFlag, parseCliArgs } from "../../shared/utils/cli.js";
import { printError, printJson, printLine } from "../../shared/utils/output.js";

export async function runCancelCommand(argv: string[]): Promise<number> {
  const parsedArgs = parseCliArgs(argv);
  const jobId = getSingleFlag(parsedArgs, "--job");
  const workspacePath = getSingleFlag(parsedArgs, "--workspace");
  const stateDirectoryPath = getSingleFlag(parsedArgs, "--state-dir");
  const jsonMode = hasFlag(parsedArgs, "--json");

  try {
    const snapshot = await cancelJob({
      jobId,
      workspacePath,
      stateDirectoryPath
    });

    if (jsonMode) {
      printJson({
        job_id: snapshot.job.id,
        status: snapshot.job.status,
        next_action: snapshot.runtime.nextAction
      });
      return 0;
    }

    printLine(`Cancelled job ${snapshot.job.id}`);
    printLine(`Status: ${snapshot.job.status}`);
    return 0;
  } catch (error) {
    printError(error instanceof Error ? error.message : "Failed to cancel job.");
    return 1;
  }
}
