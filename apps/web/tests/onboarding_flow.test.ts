import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OnboardingStepPresenter,
} from "../src/pages/onboarding/steps";

test("resolveCurrentStep returns create-agents after static onboarding setup is resolved", () => {
  assert.equal(
    OnboardingStepPresenter.resolveCurrentStep({
      githubResolved: true,
      llmResolved: true,
      missionResolved: true,
    }),
    "create-agents",
  );
});

test("onboardingPath resolves the create agents route", () => {
  assert.equal(OnboardingStepPresenter.path("create-agents"), "/onboarding/create-agents");
});
