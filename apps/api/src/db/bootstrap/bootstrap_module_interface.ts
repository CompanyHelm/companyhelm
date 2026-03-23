/**
 * Defines a single startup database bootstrap step executed while the bootstrap coordinator holds
 * the admin-database advisory lock.
 */
export interface BootstrapModuleInterface {
  /**
   * Runs the bootstrap step. Implementations must be idempotent because local development and
   * restart loops may execute the bootstrap sequence against an already-initialized database.
   */
  run(): Promise<void>;
}
