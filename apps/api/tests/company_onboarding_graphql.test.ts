import assert from "node:assert/strict";
import { test } from "vitest";
import { CompanyOnboardingPresenter } from "../src/graphql/company_onboarding_presenter.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { EnsureCompanyOnboardingMutation } from "../src/graphql/mutations/ensure_company_onboarding.ts";
import { SkipCompanyOnboardingMutation } from "../src/graphql/mutations/skip_company_onboarding.ts";
import { UpdateCompanyOnboardingMutation } from "../src/graphql/mutations/update_company_onboarding.ts";
import { CompanyOnboardingFieldResolver } from "../src/graphql/resolvers/company_onboarding.ts";

class CompanyOnboardingGraphqlTestContextFactory {
  static create(): GraphqlRequestContext {
    return {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-1",
          name: "Company 1",
          slug: "company-1",
        },
        user: {
          email: "owner@example.com",
          firstName: "Owner",
          id: "user-1",
          lastName: "Example",
        },
      } as never,
      redisCompanyScopedService: null,
      resolveSubscriptionContext: null,
    };
  }
}

test("CompanyOnboardingFieldResolver always returns the OSS completed state", async () => {
  const resolver = new CompanyOnboardingFieldResolver(new CompanyOnboardingPresenter());

  const onboarding = await resolver.execute(
    { id: "company-1" },
    {},
    CompanyOnboardingGraphqlTestContextFactory.create(),
  );

  assert.equal(onboarding.status, "completed");
  assert.equal(onboarding.githubSetupStatus, "skipped");
  assert.equal(onboarding.llmSetupStatus, "skipped");
  assert.equal(onboarding.companyId, "company-1");
});

test("company onboarding mutations are OSS no-ops that return the completed state", async () => {
  const presenter = new CompanyOnboardingPresenter();
  const context = CompanyOnboardingGraphqlTestContextFactory.create();

  const ensureResult = await new EnsureCompanyOnboardingMutation(presenter).execute({}, {}, context);
  const skipResult = await new SkipCompanyOnboardingMutation(presenter).execute({}, {}, context);
  const updateResult = await new UpdateCompanyOnboardingMutation(presenter).execute(
    {},
    {
      input: {
        companyMission: "Ignore me",
        githubSetupStatus: "completed",
        llmSetupStatus: "third_party",
      },
    },
    context,
  );

  for (const onboarding of [ensureResult, skipResult, updateResult]) {
    assert.equal(onboarding.status, "completed");
    assert.equal(onboarding.githubSetupStatus, "skipped");
    assert.equal(onboarding.llmSetupStatus, "skipped");
    assert.equal(onboarding.companyId, "company-1");
  }
});
