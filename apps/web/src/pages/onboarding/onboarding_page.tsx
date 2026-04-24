import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { ChatsPageContent } from "@/pages/chats/chats_page_content";
import {
  OnboardingCompleteState,
  OnboardingPageLoadingState,
  OnboardingPageMessageState,
  OnboardingPageSuspense,
  OnboardingSkippedState,
  navigateToOnboardingStep,
  resolveCurrentStep,
  useOnboardingFlowController,
} from "./flow";

function resolveStepLabel(step: "github" | "mission" | "model-provider"): string {
  if (step === "github") {
    return "GitHub";
  }
  if (step === "model-provider") {
    return "model provider";
  }

  return "business goals";
}

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
      controller.setupResolved
      || controller.errorMessage
      || controller.onboarding.status === "completed"
      || controller.onboarding.status === "skipped"
      || (controller.onboarding.status === "in_progress"
        && controller.onboarding.agentId
        && controller.onboarding.sessionId)
    ) {
      return;
    }

    navigateToOnboardingStep({
      navigate,
      organizationSlug,
      replace: true,
      step: resolveCurrentStep({
        githubResolved: controller.githubResolved,
        llmResolved: controller.llmResolved,
        missionResolved: controller.missionResolved,
      }),
    });
  }, [
    controller.errorMessage,
    controller.githubResolved,
    controller.llmResolved,
    controller.missionResolved,
    controller.onboarding.agentId,
    controller.onboarding.sessionId,
    controller.onboarding.status,
    controller.setupResolved,
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
    return (
      <ChatsPageContent
        canForkLatestSession={false}
        headerSubtitle="CEO setup workflow"
        headerTitle="Company onboarding"
        routePath="/onboarding"
        selectedAgentId={controller.onboarding.agentId}
        selectedSessionId={controller.onboarding.sessionId}
        showChatList={false}
        showSettingsButton={false}
      />
    );
  }

  if (!controller.setupResolved) {
    const activeStep = resolveCurrentStep({
      githubResolved: controller.githubResolved,
      llmResolved: controller.llmResolved,
      missionResolved: controller.missionResolved,
    });
    return (
      <OnboardingPageLoadingState
        message={`Opening ${resolveStepLabel(activeStep)} setup...`}
      />
    );
  }

  return <OnboardingPageLoadingState message="Provisioning the CEO onboarding chat..." />;
}
