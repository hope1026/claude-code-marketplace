export const commandCatalog = [
  "start",
  "status",
  "resume",
  "cancel",
  "result",
  "mcp"
] as const;

export type RalphCommand = (typeof commandCatalog)[number];
