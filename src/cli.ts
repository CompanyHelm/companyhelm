#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildProgram } from "./commands/register-commands.js";
import { InteractiveCommandCancelledError } from "./commands/interactive.js";
import { CliPackageMetadata } from "./core/runtime/CliPackageMetadata.js";

function shouldPrintVersion(argv = process.argv): boolean {
  const args = argv.slice(2);
  return args.length === 1 && (args[0] === "--version" || args[0] === "-V");
}

export async function main(argv = process.argv): Promise<void> {
  if (shouldPrintVersion(argv)) {
    process.stdout.write(`${new CliPackageMetadata().version()}\n`);
    return;
  }

  const program = buildProgram();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof InteractiveCommandCancelledError) {
      process.exitCode = 1;
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
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
