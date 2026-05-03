import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { AdminDatabase } from "../../db/admin_database.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { CompanyDeletionExecutor } from "./executor.ts";
import { CompanyDeletionRequestService } from "./request_service.ts";

/**
 * Executes one company deletion request from its durable row through every side effect that cannot
 * be handled by database cascades: scheduled BullMQ wakeups, provider-backed environments, and
 * finally the local company row.
 */
@injectable()
export class CompanyDeletionProcessor {
  private readonly adminDatabase: AdminDatabase;
  private readonly deletionExecutor: CompanyDeletionExecutor;
  private readonly logger: PinoLogger;
  private readonly requestService: CompanyDeletionRequestService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(CompanyDeletionRequestService) requestService: CompanyDeletionRequestService,
    @inject(CompanyDeletionExecutor) deletionExecutor: CompanyDeletionExecutor,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.adminDatabase = adminDatabase;
    this.deletionExecutor = deletionExecutor;
    this.logger = logger.child({
      component: "company_deletion_processor",
    });
    this.requestService = requestService;
  }

  async process(input: {
    requestId: string;
    workerId: string;
  }): Promise<void> {
    const request = await this.requestService.claimRequest(this.adminDatabase, input);
    if (!request) {
      return;
    }

    try {
      await this.deletionExecutor.deleteCompany({
        companyId: request.companyId,
      });
      await this.requestService.markCompleted(this.adminDatabase, request.id);
      this.logger.info({
        companyId: request.companyId,
        requestId: request.id,
      }, "completed company deletion request");
    } catch (error) {
      await this.requestService.markFailed(this.adminDatabase, {
        error,
        requestId: request.id,
      });
      this.logger.error({
        companyId: request.companyId,
        error,
        requestId: request.id,
      }, "company deletion request failed");
      throw error;
    }
  }
}
