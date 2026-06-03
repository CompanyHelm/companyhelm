/**
 * Receives user-visible CLI output so command classes can be tested without
 * coupling business behavior to process globals or a specific terminal stream.
 */
export interface CliIo {
  /** Writes a normal output line to the CLI user. */
  writeLine(message: string): void;

  /** Writes an error output line to the CLI user. */
  writeError(message: string): void;
}
