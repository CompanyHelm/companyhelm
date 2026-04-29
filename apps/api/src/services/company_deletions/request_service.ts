import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { AdminDatabase } from "../../db/admin_database.ts";
import { companies, companyDeletionRequests } from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type CompanyDeletionRequestStatus = "requested" | "processing" | "completed" | "failed";

export type CompanyDeletionRequestRecord = {
  attempts: number;
  clerkOrganizationId: string | null;
  companyId: string;
  companyName: string;
  completedAt: Date | null;
  id: string;
  lastError: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  nextAttemptAt: Date | null;
  requestedAt: Date;
  requestedByUserId: string | null;
  startedAt: Date | null;
  status: CompanyDeletionRequestStatus;
  updatedAt: Date;
};

type CompanyDeletionCompanyRecord = {
  clerkOrganizationId: string | null;
  id: string;
  name: string;
};

/**
 * Owns the durable request row that bridges user intent and destructive cleanup work. The request
 * table intentionally keeps its own company identity snapshot because the company row is deleted at
 * the end of a successful cleanup.
 */
@injectable()
export class CompanyDeletionRequestService {
  private static readonly OPEN_REQUEST_STATUSES: CompanyDeletionRequestStatus[] = [
    "requested",
    "processing",
    "failed",
  ];

  private static readonly requestSelection = {
    attempts: companyDeletionRequests.attempts,
    clerkOrganizationId: companyDeletionRequests.clerkOrganizationId,
    companyId: companyDeletionRequests.companyId,
    companyName: companyDeletionRequests.companyName,
    completedAt: companyDeletionRequests.completedAt,
    id: companyDeletionRequests.id,
    lastError: companyDeletionRequests.lastError,
    lockedAt: companyDeletionRequests.lockedAt,
    lockedBy: companyDeletionRequests.lockedBy,
    nextAttemptAt: companyDeletionRequests.nextAttemptAt,
    requestedAt: companyDeletionRequests.requestedAt,
    requestedByUserId: companyDeletionRequests.requestedByUserId,
    startedAt: companyDeletionRequests.startedAt,
    status: companyDeletionRequests.status,
    updatedAt: companyDeletionRequests.updatedAt,
  };

  async createDeletionRequest(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      requestedByUserId: string;
    },
  ): Promise<CompanyDeletionRequestRecord> {
    return transactionProvider.transaction(async (transaction) => {
      const [company] = await transaction
        .select({
          clerkOrganizationId: companies.clerkOrganizationId,
          id: companies.id,
          name: companies.name,
        })
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1) as CompanyDeletionCompanyRecord[];
      if (!company) {
        throw new Error("Company not found.");
      }

      const now = new Date();
      const existingRequest = await this.loadOpenRequestForCompany(transaction, company.id);
      if (existingRequest) {
        return existingRequest;
      }

      const createdRows = await transaction
        .insert(companyDeletionRequests)
        .values({
          clerkOrganizationId: company.clerkOrganizationId,
          companyId: company.id,
          companyName: company.name,
          requestedAt: now,
          requestedByUserId: input.requestedByUserId,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning(CompanyDeletionRequestService.requestSelection) as CompanyDeletionRequestRecord[];
      const createdRequest = createdRows[0];
      if (createdRequest) {
        return createdRequest;
      }

      const concurrentRequest = await this.loadOpenRequestForCompany(transaction, company.id);
      if (!concurrentRequest) {
        throw new Error("Failed to create company deletion request.");
      }

      return concurrentRequest;
    });
  }

  async loadRequestById(
    adminDatabase: AdminDatabase,
    requestId: string,
  ): Promise<CompanyDeletionRequestRecord | null> {
    const sql = adminDatabase.getSqlClient();
    const rows = await sql<CompanyDeletionRequestRecord[]>`
      SELECT
        id,
        company_id AS "companyId",
        clerk_organization_id AS "clerkOrganizationId",
        company_name AS "companyName",
        requested_by_user_id AS "requestedByUserId",
        status,
        attempts,
        last_error AS "lastError",
        next_attempt_at AS "nextAttemptAt",
        locked_at AS "lockedAt",
        locked_by AS "lockedBy",
        requested_at AS "requestedAt",
        started_at AS "startedAt",
        completed_at AS "completedAt",
        updated_at AS "updatedAt"
      FROM company_deletion_requests
      WHERE id = ${requestId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async listDispatchableRequests(
    adminDatabase: AdminDatabase,
    limit: number,
  ): Promise<CompanyDeletionRequestRecord[]> {
    const sql = adminDatabase.getSqlClient();
    return sql<CompanyDeletionRequestRecord[]>`
      SELECT
        id,
        company_id AS "companyId",
        clerk_organization_id AS "clerkOrganizationId",
        company_name AS "companyName",
        requested_by_user_id AS "requestedByUserId",
        status,
        attempts,
        last_error AS "lastError",
        next_attempt_at AS "nextAttemptAt",
        locked_at AS "lockedAt",
        locked_by AS "lockedBy",
        requested_at AS "requestedAt",
        started_at AS "startedAt",
        completed_at AS "completedAt",
        updated_at AS "updatedAt"
      FROM company_deletion_requests
      WHERE status = 'requested'
        OR (status = 'failed' AND (next_attempt_at IS NULL OR next_attempt_at <= now()))
        OR (status = 'processing' AND (locked_at IS NULL OR locked_at < now() - interval '30 minutes'))
      ORDER BY requested_at ASC
      LIMIT ${limit}
    `;
  }

  async claimRequest(
    adminDatabase: AdminDatabase,
    input: {
      requestId: string;
      workerId: string;
    },
  ): Promise<CompanyDeletionRequestRecord | null> {
    const sql = adminDatabase.getSqlClient();
    const rows = await sql<CompanyDeletionRequestRecord[]>`
      UPDATE company_deletion_requests
      SET
        attempts = attempts + 1,
        last_error = NULL,
        locked_at = now(),
        locked_by = ${input.workerId},
        next_attempt_at = NULL,
        started_at = COALESCE(started_at, now()),
        status = 'processing',
        updated_at = now()
      WHERE id = ${input.requestId}
        AND (
          status = 'requested'
          OR (status = 'failed' AND (next_attempt_at IS NULL OR next_attempt_at <= now()))
          OR (status = 'processing' AND (locked_at IS NULL OR locked_at < now() - interval '30 minutes'))
        )
      RETURNING
        id,
        company_id AS "companyId",
        clerk_organization_id AS "clerkOrganizationId",
        company_name AS "companyName",
        requested_by_user_id AS "requestedByUserId",
        status,
        attempts,
        last_error AS "lastError",
        next_attempt_at AS "nextAttemptAt",
        locked_at AS "lockedAt",
        locked_by AS "lockedBy",
        requested_at AS "requestedAt",
        started_at AS "startedAt",
        completed_at AS "completedAt",
        updated_at AS "updatedAt"
    `;

    return rows[0] ?? null;
  }

  async markCompleted(adminDatabase: AdminDatabase, requestId: string): Promise<void> {
    const sql = adminDatabase.getSqlClient();
    await sql`
      UPDATE company_deletion_requests
      SET
        completed_at = now(),
        locked_at = NULL,
        locked_by = NULL,
        next_attempt_at = NULL,
        status = 'completed',
        updated_at = now()
      WHERE id = ${requestId}
    `;
  }

  async markFailed(
    adminDatabase: AdminDatabase,
    input: {
      error: unknown;
      requestId: string;
    },
  ): Promise<void> {
    const sql = adminDatabase.getSqlClient();
    await sql`
      UPDATE company_deletion_requests
      SET
        last_error = ${this.formatError(input.error)},
        locked_at = NULL,
        locked_by = NULL,
        next_attempt_at = now() + (
          LEAST(3600, GREATEST(60, (60 * POWER(2, LEAST(attempts, 6)))::integer))::text || ' seconds'
        )::interval,
        status = 'failed',
        updated_at = now()
      WHERE id = ${input.requestId}
    `;
  }

  async deleteCompany(adminDatabase: AdminDatabase, companyId: string): Promise<void> {
    const sql = adminDatabase.getSqlClient();
    await sql`
      DELETE FROM companies
      WHERE id = ${companyId}
    `;
  }

  private async loadOpenRequestForCompany(
    transaction: AppRuntimeTransaction,
    companyId: string,
  ): Promise<CompanyDeletionRequestRecord | null> {
    const [request] = await transaction
      .select(CompanyDeletionRequestService.requestSelection)
      .from(companyDeletionRequests)
      .where(and(
        eq(companyDeletionRequests.companyId, companyId),
        inArray(companyDeletionRequests.status, CompanyDeletionRequestService.OPEN_REQUEST_STATUSES),
      ))
      .limit(1) as CompanyDeletionRequestRecord[];

    return request ?? null;
  }

  private formatError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 4000);
  }
}
