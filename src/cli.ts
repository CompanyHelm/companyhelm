#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildProgram } from "./commands/register-commands.js";
import { InteractiveCommandCancelledError } from "./commands/interactive.js";

export async function main(argv = process.argv): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof InteractiveCommandCancelledError) {
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

function isCliEntrypoint(argv = process.argv): boolean {
  const entrypointPath = argv[1];
  if (!entrypointPath) {
    return false;
  }

  return pathToFileURL(realpathSync(entrypointPath)).href === import.meta.url;
}

if (isCliEntrypoint()) {
  void main();
}
