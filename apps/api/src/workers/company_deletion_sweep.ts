import { inject, injectable } from "inversify";
import { ApiLogger } from "../log/api_logger.ts";
import { CompanyDeletionDispatcher } from "../services/company_deletions/dispatcher.ts";
import { WorkerBase } from "./worker_base.ts";

/**
 * Periodically reconciles durable company deletion requests back into BullMQ. This is the recovery
 * path for requests that were written while Redis was unavailable or while no worker was running.
 */
@injectable()
export class CompanyDeletionSweepWorker extends WorkerBase {
  private static readonly INTERVAL_SECONDS = 86_400;

  private readonly dispatcher: CompanyDeletionDispatcher;

  constructor(
    @inject(CompanyDeletionDispatcher) dispatcher: CompanyDeletionDispatcher,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    super("company_deletion_sweep", CompanyDeletionSweepWorker.INTERVAL_SECONDS, logger);
    this.dispatcher = dispatcher;
  }

  protected async run(): Promise<void> {
    await this.dispatcher.dispatchDueRequests();
  }
}
