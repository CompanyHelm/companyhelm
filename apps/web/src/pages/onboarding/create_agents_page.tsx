import { ChatsPageContent } from "@/pages/chats/chats_page_content";
import {
  OnboardingCompleteState,
  OnboardingPageLoadingState,
  OnboardingPageMessageState,
  OnboardingPageSuspense,
  OnboardingSkippedState,
  useOnboardingFlowController,
} from "./flow";

/**
 * Hosts the Operator onboarding chat as the first onboarding experience after the workflow has
 * provisioned its dedicated agent session.
 */
export class CreateAgentsPagePresenter {
  static resolveLoadingMessage(input: {
    isEnsureCompanyOnboardingInFlight: boolean;
    needsOnboardingStart: boolean;
  }): string {
    if (input.needsOnboardingStart || input.isEnsureCompanyOnboardingInFlight) {
      return "Provisioning the Operator onboarding chat...";
    }

    return "Opening the Operator onboarding chat...";
  }
}

export function CreateAgentsPage() {
  return (
    <OnboardingPageSuspense>
      <CreateAgentsPageContent />
    </OnboardingPageSuspense>
  );
}

function CreateAgentsPageContent() {
  const controller = useOnboardingFlowController({
    ensureOnboardingStart: true,
  });

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
        headerSubtitle="Operator setup workflow"
        headerTitle="Company onboarding"
        routePath="/onboarding/create-agents"
        selectedAgentId={controller.onboarding.agentId}
        selectedSessionId={controller.onboarding.sessionId}
        showChatList={false}
        showSettingsButton={false}
      />
    );
  }

  if (!controller.setupResolved) {
    return <OnboardingPageLoadingState message="Opening setup..." />;
  }

  return (
    <OnboardingPageLoadingState
      message={CreateAgentsPagePresenter.resolveLoadingMessage({
        isEnsureCompanyOnboardingInFlight: controller.isEnsureCompanyOnboardingInFlight,
        needsOnboardingStart: controller.needsOnboardingStart,
      })}
    />
  );
}
