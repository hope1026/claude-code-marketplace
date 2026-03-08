import { adapterFeature, isSupportedAgent } from "../../adapters/index.js";
import { createJob } from "../../job/index.js";
import { getMultiFlag, getSingleFlag, hasFlag, parseCliArgs } from "../../shared/utils/cli.js";
import { printError, printJson, printLine } from "../../shared/utils/output.js";

export async function runStartCommand(argv: string[]): Promise<number> {
  const parsedArgs = parseCliArgs(argv);
  const title = getSingleFlag(parsedArgs, "--title");
  const agent = getSingleFlag(parsedArgs, "--agent");
  const workspacePath = getSingleFlag(parsedArgs, "--workspace");
  const stateDirectoryPath = getSingleFlag(parsedArgs, "--state-dir");
  const inputDocuments = getMultiFlag(parsedArgs, "--input");
  const validateCommands = getMultiFlag(parsedArgs, "--validate-cmd");
  const maxRetriesPerTaskRaw = getSingleFlag(parsedArgs, "--max-retries");
  const jsonMode = hasFlag(parsedArgs, "--json");

  if (title === undefined) {
    printError("Missing required option: --title");
    return 1;
  }

  if (agent === undefined) {
    printError("Missing required option: --agent");
    return 1;
  }

  if (!isSupportedAgent(agent)) {
    printError(
      `Unsupported agent: ${agent}. Supported agents: ${adapterFeature.supported.join(", ")}`
    );
    return 1;
  }

  try {
    const parsedMaxRetriesPerTask =
      maxRetriesPerTaskRaw === undefined
        ? undefined
        : Number.parseInt(maxRetriesPerTaskRaw, 10);
    const invalidMaxRetries =
      parsedMaxRetriesPerTask === undefined ||
      !Number.isFinite(parsedMaxRetriesPerTask) ||
      parsedMaxRetriesPerTask < 0;

    if (maxRetriesPerTaskRaw !== undefined && invalidMaxRetries) {
      printError("`--max-retries` must be a non-negative integer.");
      return 1;
    }

    const { snapshot, paths } = await createJob({
      title,
      agent,
      workspacePath,
      stateDirectoryPath,
      inputDocuments,
      validateCommands,
      maxRetriesPerTask: parsedMaxRetriesPerTask
    });

    if (jsonMode) {
      printJson({
        job_id: snapshot.job.id,
        status: snapshot.job.status,
        workspace_path: snapshot.job.workspacePath,
        state_directory_path: snapshot.job.stateDirectoryPath,
        validation_commands: snapshot.job.validationProfile.commands,
        max_retries_per_task: snapshot.job.retryPolicy.maxRetriesPerTask,
        next_action: snapshot.runtime.nextAction,
        current_task_id: snapshot.runtime.currentTaskId
      });
      return 0;
    }

    printLine(`Started job ${snapshot.job.id}`);
    printLine(`Status: ${snapshot.job.status}`);
    printLine(`Workspace: ${snapshot.job.workspacePath}`);
    printLine(`State dir: ${snapshot.job.stateDirectoryPath}`);
    printLine(`Job dir: ${paths.jobDirectoryPath}`);

    if (snapshot.job.inputDocuments.length > 0) {
      printLine(`Inputs: ${snapshot.job.inputDocuments.map((entry) => entry.path).join(", ")}`);
    }
    if (snapshot.job.validationProfile.commands.length > 0) {
      printLine(`Validation commands: ${snapshot.job.validationProfile.commands.join(" | ")}`);
    }
    printLine(`Max retries per task: ${String(snapshot.job.retryPolicy.maxRetriesPerTask)}`);

    printLine("Next: `ralph status` or `ralph resume`");
    return 0;
  } catch (error) {
    printError(error instanceof Error ? error.message : "Failed to start job.");
    return 1;
  }
}
