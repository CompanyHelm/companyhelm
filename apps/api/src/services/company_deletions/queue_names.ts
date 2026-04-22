import { injectable } from "inversify";

/**
 * Centralizes BullMQ identifiers for company deletion jobs so the just-in-time dispatcher, daily
 * sweep, and worker stay aligned on the same queue contract.
 */
@injectable()
export class CompanyDeletionQueueNames {
  getQueueName(): string {
    return "company-deletions";
  }

  getJobName(): string {
    return "delete-company";
  }
}
