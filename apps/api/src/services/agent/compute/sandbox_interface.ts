/**
 * Describes one leased compute sandbox in a provider-agnostic shape. It intentionally exposes only
 * the minimum metadata needed to identify the runtime without coupling callers to Daytona types.
 */
export abstract class AgentComputeSandboxInterface {
  /**
   * Returns the stable application-side sandbox identifier stored in Postgres.
   */
  abstract getId(): string;

  /**
   * Returns the provider runtime identifier used to address the underlying sandbox instance.
   */
  abstract getRuntimeId(): string;

  /**
   * Returns the current runtime status so callers can decide whether the sandbox is usable.
   */
  abstract getStatus(): string;
}
