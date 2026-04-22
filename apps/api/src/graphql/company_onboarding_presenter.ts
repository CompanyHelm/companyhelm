import { injectable } from "inversify";
import type { CompanyOnboardingRecord } from "../services/onboarding/company_onboarding_service.ts";

export type GraphqlCompanyOnboardingRecord = {
  agentId: string | null;
  companyId: string;
  completedAt: string | null;
  createdAt: string;
  id: string;
  sessionId: string | null;
  skippedAt: string | null;
  skippedByUserId: string | null;
  startedAt: string | null;
  status: string;
  updatedAt: string;
  workflowRunId: string | null;
};

/**
 * Converts company onboarding state into the GraphQL shape used by the app shell. The record id is
 * intentionally the company id so Relay can normalize updates from queries and mutations into the
 * same company-scoped onboarding object.
 */
@injectable()
export class CompanyOnboardingPresenter {
  serialize(record: CompanyOnboardingRecord): GraphqlCompanyOnboardingRecord {
    return {
      agentId: record.agentId,
      companyId: record.companyId,
      completedAt: record.completedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      id: record.companyId,
      sessionId: record.sessionId,
      skippedAt: record.skippedAt?.toISOString() ?? null,
      skippedByUserId: record.skippedByUserId,
      startedAt: record.startedAt?.toISOString() ?? null,
      status: record.status,
      updatedAt: record.updatedAt.toISOString(),
      workflowRunId: record.workflowRunId,
    };
  }
}
