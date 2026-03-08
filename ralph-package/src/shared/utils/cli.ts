export interface ParsedCliArgs {
  flags: Map<string, string[]>;
  positionals: string[];
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const flags = new Map<string, string[]>();
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const [name, inlineValue] = token.split("=", 2);

    if (inlineValue !== undefined) {
      appendFlagValue(flags, name, inlineValue);
      continue;
    }

    const nextToken = argv[index + 1];

    if (nextToken !== undefined && !nextToken.startsWith("--")) {
      appendFlagValue(flags, name, nextToken);
      index += 1;
      continue;
    }

    appendFlagValue(flags, name, "true");
  }

  return { flags, positionals };
}

export function getSingleFlag(
  parsedArgs: ParsedCliArgs,
  flagName: string
): string | undefined {
  return parsedArgs.flags.get(flagName)?.at(-1);
}

export function getMultiFlag(
  parsedArgs: ParsedCliArgs,
  flagName: string
): string[] {
  return parsedArgs.flags.get(flagName) ?? [];
}

export function hasFlag(parsedArgs: ParsedCliArgs, flagName: string): boolean {
  return parsedArgs.flags.has(flagName);
}

function appendFlagValue(
  flags: Map<string, string[]>,
  flagName: string,
  value: string
): void {
  const currentValues = flags.get(flagName) ?? [];
  currentValues.push(value);
  flags.set(flagName, currentValues);
}
