import { resumeJob } from "../../execution/index.js";
import { getSingleFlag, hasFlag, parseCliArgs } from "../../shared/utils/cli.js";
import { printError, printJson, printLine } from "../../shared/utils/output.js";

export async function runResumeCommand(argv: string[]): Promise<number> {
  const parsedArgs = parseCliArgs(argv);
  const jobId = getSingleFlag(parsedArgs, "--job");
  const workspacePath = getSingleFlag(parsedArgs, "--workspace");
  const stateDirectoryPath = getSingleFlag(parsedArgs, "--state-dir");
  const maxIterationsRaw = getSingleFlag(parsedArgs, "--max-iterations");
  const jsonMode = hasFlag(parsedArgs, "--json");

  if (workspacePath === undefined && stateDirectoryPath === undefined) {
    printError("Either --workspace or --state-dir is required.");
    return 1;
  }

  try {
    const parsedMaxIterations =
      maxIterationsRaw === undefined
        ? undefined
        : Number.parseInt(maxIterationsRaw, 10);
    const invalidMaxIterations =
      parsedMaxIterations === undefined ||
      !Number.isFinite(parsedMaxIterations) ||
      parsedMaxIterations <= 0;

    if (maxIterationsRaw !== undefined && invalidMaxIterations) {
      printError("`--max-iterations` must be a positive integer.");
      return 1;
    }

    const result = await resumeJob({
      jobId,
      workspacePath,
      stateDirectoryPath,
      maxIterations: parsedMaxIterations
    });

    if (jsonMode) {
      printJson({
        job_id: result.snapshot.job.id,
        job_status: result.snapshot.job.status,
        run_id: result.runRecord?.runId ?? null,
        run_status: result.runRecord?.status ?? null,
        summary: result.runRecord?.summary ?? result.snapshot.runtime.blockedReason,
        run_directory_path: result.runDirectoryPath,
        iterations: result.iterations,
        next_action: result.snapshot.runtime.nextAction,
        blocked_reason: result.snapshot.runtime.blockedReason
      });
      return 0;
    }

    printLine(`Job: ${result.snapshot.job.id}`);
    printLine(`Run: ${result.runRecord?.runId ?? "-"}`);
    printLine(`Run status: ${result.runRecord?.status ?? "-"}`);
    printLine(`Job status: ${result.snapshot.job.status}`);
    printLine(`Summary: ${result.runRecord?.summary ?? result.snapshot.runtime.blockedReason ?? "-"}`);
    printLine(`Run dir: ${result.runDirectoryPath ?? "-"}`);
    printLine(`Iterations: ${String(result.iterations)}`);
    printLine(`Next action: ${result.snapshot.runtime.nextAction}`);
    return 0;
  } catch (error) {
    printError(error instanceof Error ? error.message : "Failed to resume job.");
    return 1;
  }
}
