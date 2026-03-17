import * as clack from "@clack/prompts";
import type { Readable, Writable } from "node:stream";

export class InteractiveCommandCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InteractiveCommandCancelledError";
  }
}

function isReadableTty(input: Readable): boolean {
  return "isTTY" in input && Boolean(input.isTTY);
}

export function hasInteractiveTerminal(input: Readable, output: Writable): boolean {
  return isReadableTty(input) && clack.isTTY(output);
}

export function requireInteractiveTerminal(input: Readable, output: Writable, message: string): void {
  if (!hasInteractiveTerminal(input, output)) {
    throw new Error(message);
  }
}

export function unwrapPromptResult<T>(value: T | symbol, message: string, output: Writable): T {
  if (clack.isCancel(value)) {
    clack.cancel(message, { output });
    throw new InteractiveCommandCancelledError(message);
  }

  return value;
}
