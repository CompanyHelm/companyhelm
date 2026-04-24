import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  OnboardingModelProviderDialog,
  OnboardingNavigation,
  OnboardingPageSuspense,
  OnboardingStepFrame,
  navigateToOnboardingStep,
  useOnboardingFlowController,
} from "./flow";

export function ModelProviderPage() {
  return (
    <OnboardingPageSuspense>
      <ModelProviderPageContent />
    </OnboardingPageSuspense>
  );
}

function ModelProviderPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const controller = useOnboardingFlowController();

  useEffect(() => {
    if (
      controller.onboarding.status === "completed"
      || controller.onboarding.status === "skipped"
      || controller.onboarding.status === "in_progress"
      || controller.setupResolved
    ) {
      void navigate({
        params: {
          organizationSlug,
        },
        replace: true,
        to: OrganizationPath.route("/onboarding"),
      });
      return;
    }
    if (!controller.missionResolved) {
      navigateToOnboardingStep({
        navigate,
        organizationSlug,
        replace: true,
        step: "mission",
      });
      return;
    }
    if (!controller.githubResolved) {
      navigateToOnboardingStep({
        navigate,
        organizationSlug,
        replace: true,
        step: "github",
      });
      return;
    }
  }, [
    controller.githubResolved,
    controller.missionResolved,
    controller.onboarding.status,
    controller.setupResolved,
    navigate,
    organizationSlug,
  ]);

  return (
    <>
      <OnboardingStepFrame
        currentStep="model-provider"
        description="Choose how this company will access LLMs before CompanyHelm provisions the CEO chat."
        errorMessage={controller.errorMessage}
        helperText={controller.llmResolved
          ? `LLM setup saved as ${controller.onboarding.llmSetupStatus.replace("_", " ")}.`
          : "CompanyHelm-managed support is limited right now, so a third-party provider is the recommended default."}
        title="Model provider setup"
      >
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            CompanyHelm currently offers limited managed support. A third-party provider gives the CEO
            and the first agent suggestions the broadest model coverage and the least friction.
          </p>
          <p>
            After this step, CompanyHelm provisions the CEO chat. Its first workflow will ask about
            additional agents, repo checkout, and patterns like BMAD or other public agent skill sets.
          </p>
        </div>
        <OnboardingNavigation backStep="github">
          <Button
            disabled={controller.isAddModelProviderCredentialInFlight}
            onClick={() => {
              controller.setCredentialDialogOpen(true);
            }}
            size="sm"
            type="button"
          >
            Add third-party provider
          </Button>
          <Button
            disabled={controller.isUpdateCompanyOnboardingInFlight || !controller.hasThirdPartyCredential}
            onClick={() => {
              controller.clearErrorMessage();
              void controller.updateOnboarding({
                llmSetupStatus: "third_party",
              }).then(() => {
                void navigate({
                  params: {
                    organizationSlug,
                  },
                  to: OrganizationPath.route("/onboarding"),
                });
              }).catch(() => undefined);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Use existing third-party provider
          </Button>
          <Button
            disabled={controller.isUpdateCompanyOnboardingInFlight || !controller.hasManagedCredential}
            onClick={() => {
              controller.clearErrorMessage();
              void controller.updateOnboarding({
                llmSetupStatus: "company_managed",
              }).then(() => {
                void navigate({
                  params: {
                    organizationSlug,
                  },
                  to: OrganizationPath.route("/onboarding"),
                });
              }).catch(() => undefined);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Use CompanyHelm-managed
          </Button>
          <Button
            disabled={controller.isUpdateCompanyOnboardingInFlight}
            onClick={() => {
              controller.clearErrorMessage();
              void controller.updateOnboarding({
                llmSetupStatus: "skipped",
              }).then(() => {
                void navigate({
                  params: {
                    organizationSlug,
                  },
                  to: OrganizationPath.route("/onboarding"),
                });
              }).catch(() => undefined);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Skip for now
          </Button>
        </OnboardingNavigation>
      </OnboardingStepFrame>
      <OnboardingModelProviderDialog
        controller={controller}
        onCompleted={() => {
          void navigate({
            params: {
              organizationSlug,
            },
            to: OrganizationPath.route("/onboarding"),
          });
        }}
      />
    </>
  );
}
