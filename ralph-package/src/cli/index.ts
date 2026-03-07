import { commandCatalog } from "./catalog/index.js";
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
    "  ralph <command>",
    "",
    "Commands:",
    "  start",
    "  status",
    "  resume",
    "  cancel",
    "  result",
    "  mcp",
    "",
    "This scaffold wires the agreed package structure and contracts.",
    `Available commands: ${commandCatalog.join(", ")}`
  ];

  process.stdout.write(`${helpText.join("\n")}\n`);
}

function main(argv: string[]): number {
  const [command] = argv;

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
      return runStartCommand();
    case "status":
      return runStatusCommand();
    case "resume":
      return runResumeCommand();
    case "cancel":
      return runCancelCommand();
    case "result":
      return runResultCommand();
    case "mcp":
      return startMcpServer();
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      printHelp();
      return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
