import assert from "node:assert/strict";
import { test } from "vitest";
import { CompanyOnboardingPresenter } from "../src/graphql/company_onboarding_presenter.ts";
import type { CompanyOnboardingRecord } from "../src/services/onboarding/company_onboarding_service.ts";

/**
 * Builds complete onboarding records so presenter tests can focus on the GraphQL identity contract
 * without repeating unrelated timestamp and setup-state fields.
 */
class CompanyOnboardingPresenterTestRecordFactory {
  static create(input: Partial<CompanyOnboardingRecord> = {}): CompanyOnboardingRecord {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");

    return {
      agentId: null,
      companyMission: null,
      companyId: "company-123",
      completedAt: null,
      createdAt,
      githubCompletedAt: null,
      githubSetupStatus: "pending",
      githubSkippedAt: null,
      llmCompletedAt: null,
      llmSetupStatus: "pending",
      llmSkippedAt: null,
      missionSkippedAt: null,
      sessionId: null,
      skippedAt: null,
      skippedByUserId: null,
      startedAt: null,
      status: "not_started",
      updatedAt: createdAt,
      workflowRunId: null,
      ...input,
    };
  }
}

test("CompanyOnboardingPresenter uses a GraphQL id that cannot collide with AuthenticatedCompany", () => {
  const companyId = "ca5a8b8b-f8d7-47cb-9349-39866c0f7b59";
  const presenter = new CompanyOnboardingPresenter();

  const presentedOnboarding = presenter.serialize(
    CompanyOnboardingPresenterTestRecordFactory.create({
      companyId,
    }),
  );

  assert.equal(presentedOnboarding.companyId, companyId);
  assert.equal(presentedOnboarding.id, `CompanyOnboarding:${companyId}`);
});

test("CompanyOnboardingPresenter can synthesize the OSS completed state", () => {
  const presenter = new CompanyOnboardingPresenter();

  const presentedOnboarding = presenter.createCompletedRecord("company-oss");

  assert.equal(presentedOnboarding.companyId, "company-oss");
  assert.equal(presentedOnboarding.id, "CompanyOnboarding:company-oss");
  assert.equal(presentedOnboarding.status, "completed");
  assert.equal(presentedOnboarding.githubSetupStatus, "skipped");
  assert.equal(presentedOnboarding.llmSetupStatus, "skipped");
  assert.equal(presentedOnboarding.agentId, null);
  assert.equal(presentedOnboarding.sessionId, null);
  assert.equal(presentedOnboarding.workflowRunId, null);
});
