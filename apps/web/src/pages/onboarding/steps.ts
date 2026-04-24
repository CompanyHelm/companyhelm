export type OnboardingStepKey = "mission" | "github" | "model-provider" | "create-agents";

/**
 * Keeps onboarding step routing decisions independent from the Relay-backed controller so route
 * guards and tests can share one source of truth without loading page runtime dependencies.
 */
export class OnboardingStepPresenter {
  static resolveCurrentStep(input: {
    githubResolved: boolean;
    llmResolved: boolean;
    missionResolved: boolean;
  }): OnboardingStepKey {
    if (!input.githubResolved) {
      return "github";
    }
    if (!input.llmResolved) {
      return "model-provider";
    }
    if (!input.missionResolved) {
      return "mission";
    }

    return "create-agents";
  }

  static path(step: OnboardingStepKey): string {
    switch (step) {
      case "mission":
        return "/onboarding/mission";
      case "github":
        return "/onboarding/github";
      case "model-provider":
        return "/onboarding/model-provider";
      case "create-agents":
        return "/onboarding/create-agents";
    }
  }
}
