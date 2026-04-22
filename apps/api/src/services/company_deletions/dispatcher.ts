import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { AdminDatabase } from "../../db/admin_database.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { CompanyDeletionQueueService } from "./queue.ts";
import { CompanyDeletionRequestService } from "./request_service.ts";

/**
 * Dispatches deletion requests into BullMQ from either the user-facing mutation or a periodic
 * sweep. Keeping both entry points here makes the immediate path and recovery path share the same
 * idempotent enqueue behavior.
 */
@injectable()
export class CompanyDeletionDispatcher {
  private static readonly DEFAULT_SWEEP_LIMIT = 100;

  private readonly adminDatabase: AdminDatabase;
  private readonly logger: PinoLogger;
  private readonly queueService: CompanyDeletionQueueService;
  private readonly requestService: CompanyDeletionRequestService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(CompanyDeletionQueueService) queueService: CompanyDeletionQueueService,
    @inject(CompanyDeletionRequestService) requestService: CompanyDeletionRequestService,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.adminDatabase = adminDatabase;
    this.logger = logger.child({
      component: "company_deletion_dispatcher",
    });
    this.queueService = queueService;
    this.requestService = requestService;
  }

  async dispatchRequest(requestId: string): Promise<void> {
    const request = await this.requestService.loadRequestById(this.adminDatabase, requestId);
    if (!request || request.status === "completed") {
      return;
    }

    await this.queueService.enqueueRequest(request.id);
  }

  async dispatchDueRequests(limit = CompanyDeletionDispatcher.DEFAULT_SWEEP_LIMIT): Promise<number> {
    const requests = await this.requestService.listDispatchableRequests(this.adminDatabase, limit);
    for (const request of requests) {
      await this.queueService.enqueueRequest(request.id);
    }

    if (requests.length > 0) {
      this.logger.info({
        requestCount: requests.length,
      }, "dispatched company deletion requests");
    }

    return requests.length;
  }
}
