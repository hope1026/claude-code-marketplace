import { mcpToolCatalog } from "./tools/index.js";

export function startMcpServer(): number {
  process.stdout.write("Ralph MCP bootstrap is not implemented yet.\n");
  process.stdout.write(`Planned tools: ${mcpToolCatalog.join(", ")}\n`);
  return 1;
}
