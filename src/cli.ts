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

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
