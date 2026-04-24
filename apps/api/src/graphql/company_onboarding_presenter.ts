import { injectable } from "inversify";
import type { CompanyOnboardingRecord } from "../services/onboarding/company_onboarding_service.ts";

export type GraphqlCompanyOnboardingRecord = {
  agentId: string | null;
  companyMission: string | null;
  companyId: string;
  completedAt: string | null;
  createdAt: string;
  githubCompletedAt: string | null;
  githubSetupStatus: string;
  githubSkippedAt: string | null;
  id: string;
  llmCompletedAt: string | null;
  llmSetupStatus: string;
  llmSkippedAt: string | null;
  missionSkippedAt: string | null;
  sessionId: string | null;
  skippedAt: string | null;
  skippedByUserId: string | null;
  startedAt: string | null;
  status: string;
  updatedAt: string;
  workflowRunId: string | null;
};

/**
 * Converts company onboarding state into the GraphQL shape used by the app shell. The onboarding
 * object is keyed by a type-qualified company id because Relay requires ids to be globally unique
 * across GraphQL object types, while `companyId` preserves the raw company relationship.
 */
@injectable()
export class CompanyOnboardingPresenter {
  serialize(record: CompanyOnboardingRecord): GraphqlCompanyOnboardingRecord {
    return {
      agentId: record.agentId,
      companyMission: record.companyMission,
      companyId: record.companyId,
      completedAt: record.completedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      githubCompletedAt: record.githubCompletedAt?.toISOString() ?? null,
      githubSetupStatus: record.githubSetupStatus,
      githubSkippedAt: record.githubSkippedAt?.toISOString() ?? null,
      id: `CompanyOnboarding:${record.companyId}`,
      llmCompletedAt: record.llmCompletedAt?.toISOString() ?? null,
      llmSetupStatus: record.llmSetupStatus,
      llmSkippedAt: record.llmSkippedAt?.toISOString() ?? null,
      missionSkippedAt: record.missionSkippedAt?.toISOString() ?? null,
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
