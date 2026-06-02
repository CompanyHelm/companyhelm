/**
 * Receives runner CLI output so command behavior can be validated without
 * invoking global console methods from command handlers.
 */
export interface RunnerIo {
  /** Writes a normal runner output line to the user. */
  writeLine(message: string): void;

  /** Writes an error output line to the user. */
  writeError(message: string): void;
}
