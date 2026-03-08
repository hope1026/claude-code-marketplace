import { runCancelCommand } from "./cancel/index.js";
import { runResultCommand } from "./result/index.js";
import { runResumeCommand } from "./resume/index.js";
import { runStartCommand } from "./start/index.js";
import { runStatusCommand } from "./status/index.js";
import { startMcpServer } from "../mcp/index.js";
import { packageName, version } from "../shared/constants/index.js";

function printHelp(): void {
  const helpText = [
    `${packageName} v${version}`,
    "",
    "Usage:",
    "  ralph <command> [options]",
    "",
    "Commands:",
    "  start    Create a new job",
    "  status   Show current job status",
    "  resume   Resume job execution",
    "  cancel   Cancel a running job",
    "  result   Show job result and reports",
    "  mcp      Start MCP server (stdin/stdout)",
    "",
    "Common options:",
    "  --workspace <path>   Working directory for agent execution",
    "  --state-dir <path>   State storage root override",
    "  --json               Output in JSON format",
    "",
    "Start options:",
    "  --title <text>       Job title (required)",
    "  --agent <name>       Agent adapter: codex, claude-code, custom-command (required)",
    "  --input <path>       Input file/image/directory reference (repeatable)",
    "  --validate-cmd <cmd> Validation command (repeatable)",
    "  --max-retries <n>    Max retries per task",
    "",
    "Resume options:",
    "  --max-iterations <n> Max iterations per resume call",
    "",
    "Status/Cancel/Result options:",
    "  --job <id>           Job ID (defaults to current job)",
    "",
    "Flags:",
    "  --help, -h           Show this help",
    "  --version, -v        Show version"
  ];

  process.stdout.write(`${helpText.join("\n")}\n`);
}

async function main(argv: string[]): Promise<number> {
  const [command] = argv;
  const commandArgs = argv.slice(1);

  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return 0;
    case "version":
    case "--version":
    case "-v":
      process.stdout.write(`${version}\n`);
      return 0;
    case "start":
      return runStartCommand(commandArgs);
    case "status":
      return runStatusCommand(commandArgs);
    case "resume":
      return runResumeCommand(commandArgs);
    case "cancel":
      return runCancelCommand(commandArgs);
    case "result":
      return runResultCommand(commandArgs);
    case "mcp":
      return startMcpServer();
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      printHelp();
      return 1;
  }
}

void main(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode;
});
