import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  OnboardingCompleteState,
  OnboardingPageLoadingState,
  OnboardingPageMessageState,
  OnboardingPageSuspense,
  OnboardingSkippedState,
  onboardingPath,
  useOnboardingFlowController,
} from "./flow";

export function OnboardingPage() {
  return (
    <OnboardingPageSuspense>
      <OnboardingPageContent />
    </OnboardingPageSuspense>
  );
}

function OnboardingPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const controller = useOnboardingFlowController({
    ensureOnboardingStart: true,
  });

  useEffect(() => {
    if (
      controller.errorMessage
      || controller.onboarding.status === "completed"
      || controller.onboarding.status === "skipped"
    ) {
      return;
    }

    if (controller.onboarding.status === "in_progress" && controller.onboarding.agentId && controller.onboarding.sessionId) {
      void navigate({
        params: {
          organizationSlug,
        },
        replace: true,
        to: OrganizationPath.route(onboardingPath("create-agents")),
      });
      return;
    }

    void navigate({
      params: {
        organizationSlug,
      },
      replace: true,
      to: OrganizationPath.route(onboardingPath("create-agents")),
    });
  }, [
    controller.errorMessage,
    controller.onboarding.agentId,
    controller.onboarding.sessionId,
    controller.onboarding.status,
    navigate,
    organizationSlug,
  ]);

  if (controller.errorMessage) {
    return (
      <OnboardingPageMessageState
        actionLabel="Try again"
        message={controller.errorMessage}
        onAction={controller.clearErrorMessage}
        title="Onboarding failed"
      />
    );
  }

  if (controller.onboarding.status === "completed") {
    return <OnboardingCompleteState />;
  }

  if (controller.onboarding.status === "skipped") {
    return <OnboardingSkippedState />;
  }

  if (controller.onboarding.status === "in_progress" && controller.onboarding.agentId && controller.onboarding.sessionId) {
    return <OnboardingPageLoadingState message="Opening agent creation..." />;
  }

  return <OnboardingPageLoadingState message="Provisioning the CEO onboarding chat..." />;
}
